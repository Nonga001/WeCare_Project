import { useState } from "react";

const SuperAdminNotifications = () => {
  const [message, setMessage] = useState("");
  const [list, setList] = useState([
    { id: 1, text: "Global: Maintenance window on Friday 10 AM." },
    { id: 2, text: "Alert: High error rate from payment webhook." },
  ]);

  const send = () => {
    if (!message.trim()) return;
    setList([{ id: Date.now(), text: message.trim() }, ...list]);
    setMessage("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Send Global Notification</h3>
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Write a system-wide message..." className="w-full min-h-[120px] px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <div className="mt-3 flex justify-end">
            <button onClick={send} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">Send</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Recent Notifications</h4>
          <ul className="space-y-2">
            {list.map((n) => (
              <li key={n.id} className="text-sm text-slate-600">• {n.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminNotifications;


