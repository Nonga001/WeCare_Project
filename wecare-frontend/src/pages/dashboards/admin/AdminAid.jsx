const AdminAid = () => {
  const requests = [
    { id: 1, type: "Financial", requester: "Jane Doe", detail: "KES 8,000", status: "pending" },
    { id: 2, type: "Essentials", requester: "Mary W.", detail: "Baby food x5", status: "approved" },
  ];
  const filter = (list, q, type) => list.filter((r)=> (type? r.type===type : true) && (r.requester+" "+r.detail).toLowerCase().includes(q.toLowerCase()));
  let q = "";
  let t = "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Aid Requests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input onChange={(e)=>{q=e.target.value; const n=document.getElementById('aid_list'); if(n){ n.dataset.q=q; }}} placeholder="Search requester or detail" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <select onChange={(e)=>{t=e.target.value; const n=document.getElementById('aid_list'); if(n){ n.dataset.t=t; }}} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">All Types</option>
            <option value="Financial">Financial</option>
            <option value="Essentials">Essentials</option>
          </select>
          <div></div>
        </div>
        <div id="aid_list" className="space-y-3" data-q="" data-t="">
          {filter(requests, document?.getElementById('aid_list')?.dataset?.q || "", document?.getElementById('aid_list')?.dataset?.t || "").map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{r.type} - {r.detail}</p>
              <p className="text-sm text-slate-600">Requester: {r.requester}</p>
              <p className="text-xs text-slate-500">Status: {r.status}</p>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Approve</button>
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Disburse</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Distribution Tracker</h3>
        <p className="text-sm text-slate-600">Monitor aid distribution progress.</p>
      </div>
    </div>
  );
};

export default AdminAid;


