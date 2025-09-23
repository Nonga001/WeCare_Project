import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listGroups, joinGroup, leaveGroup, getGroup, postMessage, deleteMessage } from "../../../services/groupService";

const StudentSupport = () => {
  const { user } = useAuth();
  const [uniGroups, setUniGroups] = useState([]);
  const [globalGroups, setGlobalGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openGroup, setOpenGroup] = useState(null);
  const [openGroupId, setOpenGroupId] = useState(null);
  const [text, setText] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [ug, gg] = await Promise.all([
        listGroups(user?.token, "uni"),
        listGroups(user?.token, "global")
      ]);
      setUniGroups(ug);
      setGlobalGroups(gg);
    } catch (e) {
      setError("Failed to load groups");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.token) load(); }, [user?.token]);

  const onJoin = async (id, anonymous) => {
    try {
      await joinGroup(user?.token, id, anonymous);
      await load();
      if (openGroupId === id) {
        const d = await getGroup(user?.token, id);
        setOpenGroup(d);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to join");
    }
  };
  const onLeave = async (id) => {
    try {
      await leaveGroup(user?.token, id);
      await load();
      if (openGroupId === id) {
        const d = await getGroup(user?.token, id);
        setOpenGroup(d);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to leave");
    }
  };

  const openMessages = async (id) => {
    try {
      setOpenGroupId(id);
      const d = await getGroup(user?.token, id);
      setOpenGroup(d);
    } catch (e) {
      setError("Failed to open group");
    }
  };

  // removed request-join flow

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5">
          <h3 className="mb-3">Peer Groups</h3>
          {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
          {loading ? (
            <p className="text-sm text-slate-500">Loading groups...</p>
          ) : (
            <>
              <h4 className="text-slate-700 font-medium mb-2">Your University</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {uniGroups.map((g) => (
                  <div key={g._id} className="card p-4 hover:shadow-lg transition-shadow">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                    {g.isMember ? (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <button onClick={()=>openMessages(g._id)} className="btn btn-primary">Open</button>
                          <button onClick={()=>onLeave(g._id)} className="btn btn-secondary">Leave</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button onClick={()=>onJoin(g._id, false)} className="btn btn-primary">Join Publicly</button>
                        <button onClick={()=>onJoin(g._id, true)} className="btn btn-ghost border">Join Anonymous</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <h4 className="text-slate-700 font-medium mb-2">Global Groups</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {globalGroups.map((g) => (
                  <div key={g._id} className="card p-4 hover:shadow-lg transition-shadow">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                    {g.isMember ? (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <button onClick={()=>openMessages(g._id)} className="btn btn-primary">Open</button>
                          <button onClick={()=>onLeave(g._id)} className="btn btn-secondary">Leave</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button onClick={()=>onJoin(g._id, false)} className="btn btn-primary">Join Publicly</button>
                        <button onClick={()=>onJoin(g._id, true)} className="btn btn-ghost border">Join Anonymous</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
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
        <div className="card p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Group Chat</h4>
          {!openGroup ? (
            <p className="text-sm text-slate-600">Open a group to view and send messages.</p>
          ) : (
            <div>
              <p className="font-medium text-slate-800">{openGroup.name}</p>
              <p className="text-xs text-slate-600 mb-2">{openGroup.isGlobal ? 'Global' : `University: ${openGroup.university || '-'}`}</p>
              <div className="border rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-auto p-3 space-y-2 bg-white">
                  {openGroup.messages?.length ? openGroup.messages.map(msg => {
                    const mine = msg.sender === user?._id;
                    return (
                      <div key={msg._id} className={`flex ${mine? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                          <p className="text-[11px] opacity-80 mb-0.5">{msg.senderName || 'Member'} • {new Date(msg.createdAt).toLocaleTimeString()}</p>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          {mine && (
                            <div className="text-[10px] mt-1 flex justify-end opacity-70">
                              <button onClick={async()=>{ try { await deleteMessage(user?.token, openGroup._id, msg._id); const d = await getGroup(user?.token, openGroup._id); setOpenGroup(d);} catch(e){ alert('Failed to delete'); } }} className={`hover:underline ${mine? 'text-white' : 'text-slate-600'}`}>Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-2 text-sm text-slate-500">No messages yet.</div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 flex gap-2">
                  <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..." className="input flex-1" />
                  <button onClick={async()=>{ if(!text.trim()) return; try{ await postMessage(user?.token, openGroup._id, text.trim()); setText(""); const d = await getGroup(user?.token, openGroup._id); setOpenGroup(d);} catch(e){ alert('Failed to send'); } }} className="btn btn-primary">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <a href="#emergency" className="block text-center rounded-xl bg-rose-600 text-white font-semibold py-3 shadow hover:bg-rose-700">
          Emergency: Call Campus Help
        </a>
      </div>
    </div>
  );
};

export default StudentSupport;


