const SuperAdminUsers = () => {
  const users = [
    { id: 1, name: "Jane Doe", email: "jane@uni.ac.ke", role: "student" },
    { id: 2, name: "Admin UON", email: "admin@uon.ac.ke", role: "admin" },
    { id: 3, name: "John Donor", email: "john@ngo.org", role: "donor" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">User Management</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u)=> (
                <tr key={u.id} className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-800">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{u.role}</span>
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Assign Role</button>
                    <button className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUsers;


