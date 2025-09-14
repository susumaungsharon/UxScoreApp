
const Dashboard = ({ token, role }) => {

  const isAdmin = role === 'Admin';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects Dashboard</h1>
        <p className="text-gray-600">Manage and monitor your website evaluation projects</p>
      </div>

    </div>
  );
};

export default Dashboard;