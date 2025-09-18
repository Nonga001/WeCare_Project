const AdminVerify = () => {
  const pending = [
    { id: 1, name: "Jane Doe", university: "Nairobi University", docs: ["student_card.pdf"] },
    { id: 2, name: "Mary W.", university: "Kenyatta University", docs: ["admission_letter.jpg"] },
  ];
  const verified = [
    { id: 3, name: "Aisha K.", university: "Moi University" },
  ];
  const filterList = (list, q) => list.filter((i) => (i.name + " " + (i.university||"")).toLowerCase().includes(q.toLowerCase()));
  let query = "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Pending Registrations</h3>
        <input onChange={(e)=>{query = e.target.value; const n = document.getElementById('pending_container'); if(n){ n.dataset.q = query; } }} placeholder="Search name or university..." className="w-full mb-3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
        <div id="pending_container" className="space-y-3" data-q="">
          {filterList(pending, document?.getElementById('pending_container')?.dataset?.q || "").map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{p.name}</p>
              <p className="text-sm text-slate-600">{p.university}</p>
              <div className="mt-2">
                {p.docs.map((d, i) => (
                  <span key={i} className="inline-block text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded mr-2">{d}</span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Approve</button>
                <button className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Verified Student Mothers</h3>
        <input onChange={(e)=>{query = e.target.value; const n = document.getElementById('verified_container'); if(n){ n.dataset.q = query; } }} placeholder="Search name or university..." className="w-full mb-3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
        <div id="verified_container" className="space-y-3" data-q="">
          {filterList(verified, document?.getElementById('verified_container')?.dataset?.q || "").map((v) => (
            <div key={v.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{v.name}</p>
              <p className="text-sm text-slate-600">{v.university}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminVerify;


