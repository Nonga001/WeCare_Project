const StudentSupport = () => {
  const groups = [
    { id: 1, name: "Mom Scholars 2025", members: 148 },
    { id: 2, name: "First-year Moms", members: 76 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Peer Groups</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <p className="font-medium text-slate-800">{g.name}</p>
                <p className="text-sm text-slate-600">Members: {g.members}</p>
                <button className="mt-3 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700">Join</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Mental Health Resources</h3>
          <ul className="list-disc ml-5 text-slate-600 text-sm space-y-1">
            <li>Counseling center contacts</li>
            <li>Guided mindfulness audios</li>
            <li>Student moms community handbook</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">AI Assistant</h4>
          <p className="text-slate-600 text-sm">Get maternal and academic guidance.</p>
          <button className="mt-3 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Open Assistant</button>
        </div>

        <a href="#emergency" className="block text-center rounded-xl bg-rose-600 text-white font-semibold py-3 shadow hover:bg-rose-700">
          Emergency: Call Campus Help
        </a>
      </div>
    </div>
  );
};

export default StudentSupport;


