using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using UXScore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("Api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 64;
    });

builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
})
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
             ?? builder.Configuration["JwtSettings:SecretKey"]
             ?? throw new InvalidOperationException("JWT_SECRET_KEY not found");

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") 
                ?? builder.Configuration["JwtSettings:Issuer"] 
                ?? "UXScore.API";

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") 
                  ?? builder.Configuration["JwtSettings:Audience"] 
                  ?? "UXScore.Client";

var connectionString = GetConnectionString(builder.Configuration);
Console.WriteLine($"Connection string configured!");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(5)
    };
});

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "UX Score API", 
        Version = "v1",
        Description = "API for UX Score application"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token with Bearer prefix (e.g., 'Bearer your-token')",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',') 
    ?? ["http://localhost:3000", "http://localhost:3001"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", corsPolicyBuilder =>
    {
        if (builder.Environment.IsDevelopment())
        {
            corsPolicyBuilder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
        else
        {
            corsPolicyBuilder
                .WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Urls.Add($"http://0.0.0.0:{port}");
Console.WriteLine($"Application configured to listen on port: {port}");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "UX Score API v1");
        c.RoutePrefix = "swagger";
    });
}
else
{
    app.UseExceptionHandler("/Error");
}

var useHttpsRedirection = Environment.GetEnvironmentVariable("USE_HTTPS_REDIRECTION")?.ToLower() == "true";
if (useHttpsRedirection)
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowSpecificOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { 
    status = "healthy!", 
    timestamp = DateTime.UtcNow,
    service = "UXScore API"
}));

await InitializeDatabaseAsync(app);
await SeedUsersAsync(app);

app.Run();
return;

static string GetConnectionString(IConfiguration configuration)
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    
    Console.WriteLine($"Raw DATABASE_URL exists: {!string.IsNullOrEmpty(databaseUrl)}");
    
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        try
        {
            if (databaseUrl.StartsWith("postgres://"))
            {
                var uri = new Uri(databaseUrl);
                var connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={uri.UserInfo.Split(':')[0]};Password={uri.UserInfo.Split(':')[1]};SSL Mode=Require;Trust Server Certificate=true;";
                Console.WriteLine("Converted Railway PostgresSQL URL to connection string");
                return connectionString;
            }
            
            if (databaseUrl.Contains("Host=") || databaseUrl.Contains("Server="))
            {
                Console.WriteLine("Using direct connection string format");
                return databaseUrl;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing DATABASE_URL: {ex.Message}");
        }
    }
    
    var fallbackConnectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(fallbackConnectionString))
    {
        Console.WriteLine("Using fallback connection string from configuration");
        return fallbackConnectionString;
    }
    
    throw new InvalidOperationException("No valid database connection string found. Please check DATABASE_URL environment variable or DefaultConnection in configuration.");
}

async Task InitializeDatabaseAsync(WebApplication webApplication)
{
    try
    {
        using var scope = webApplication.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var canConnect = await context.Database.CanConnectAsync();
        Console.WriteLine($"Database connection test: {(canConnect ? "SUCCESS" : "FAILED")}");
        
        if (!canConnect)
        {
            try
            {
                await context.Database.ExecuteSqlRawAsync(new StringBuilder().Append("SELECT 1").ToString());
            }
            catch (Exception innerEx)
            {
                Console.WriteLine($"Detailed connection error: {innerEx.GetType().Name}: {innerEx.Message}");
                if (innerEx.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {innerEx.InnerException.GetType().Name}: {innerEx.InnerException.Message}");
                }
            }
            
            throw new InvalidOperationException("Cannot connect to database. Please check connection string.");
        }
        
        await context.Database.EnsureCreatedAsync();
        
        webApplication.Logger.LogInformation("Database initialized successfully");
    }
    catch (Exception ex)
    {
        webApplication.Logger.LogError(ex, "Error initializing database");
        Console.WriteLine($"Database initialization error: {ex.Message}");
        throw;
    }
}

async Task SeedUsersAsync(WebApplication webApplication)
{
    try
    {
        using var scope = webApplication.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        string[] roles = ["Admin", "Evaluator"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        const string adminEmail = "admin@uxscore.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new IdentityUser
            {
                UserName = "admin",
                Email = adminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, "Admin123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
                webApplication.Logger.LogInformation("Admin user created successfully");
            }
            else
            {
                webApplication.Logger.LogError("Failed to create admin user: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }

        const string evaluatorEmail = "evaluator@uxscore.com";
        var evaluatorUser = await userManager.FindByEmailAsync(evaluatorEmail);
        if (evaluatorUser == null)
        {
            evaluatorUser = new IdentityUser
            {
                UserName = "evaluator",
                Email = evaluatorEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(evaluatorUser, "Evaluator123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(evaluatorUser, "Evaluator");
                webApplication.Logger.LogInformation("Evaluator user created successfully");
            }
            else
            {
                webApplication.Logger.LogError("Failed to create evaluator user: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
    catch (Exception ex)
    {
        webApplication.Logger.LogError(ex, "Error seeding users");
        throw;
    }
}
