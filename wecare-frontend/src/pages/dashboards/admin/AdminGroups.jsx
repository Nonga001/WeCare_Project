import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listGroups, createGroup, renameGroup, deleteGroup, getGroup, removeMember, postMessage, deleteMessage } from "../../../services/groupService";

const AdminGroups = () => {
  const { user } = useAuth();
  const [uniGroups, setUniGroups] = useState([]);
  const [globalGroups, setGlobalGroups] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("uni");
  const [messageText, setMessageText] = useState("");
  // removed private group UI

  const load = async () => {
    try {
      setLoading(true);
      const [ug, gg] = await Promise.all([
        listGroups(user?.token, "uni"),
        listGroups(user?.token, "global")
      ]);
      setUniGroups(ug); setGlobalGroups(gg);
      if (selectedId) {
        const details = await getGroup(user?.token, selectedId);
        setSelected(details);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.token) load(); /* eslint-disable-next-line */ }, [user?.token]);

  const onCreate = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await createGroup(user?.token, { name: newName.trim() });
      setNewName(""); setNewScope("uni");
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const openDetails = async (id) => {
    setSelectedId(id);
    try {
      const details = await getGroup(user?.token, id);
      setSelected(details);
    } catch (e) {
      alert("Failed to open group");
    }
  };

  const onRename = async () => {
    const name = prompt("New group name", selected?.name || "");
    if (!name) return;
    try {
      await renameGroup(user?.token, selected._id, name);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to rename");
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    try {
      await deleteGroup(user?.token, selected._id);
      setSelected(null); setSelectedId(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete");
    }
  };

  const onRemoveMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeMember(user?.token, selected._id, userId);
      const details = await getGroup(user?.token, selected._id);
      setSelected(details);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to remove member");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Create Group</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Group name" className="px-3 py-2 border rounded-lg text-sm" />
            <select value={newScope} onChange={(e)=>setNewScope(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="uni">University</option>
            </select>
            <button disabled={creating} onClick={onCreate} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60">{creating?"Creating...":"Create"}</button>
          </div>
          
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Your University Groups</h3>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uniGroups.map((g)=> (
                <div key={g._id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <p className="font-medium text-slate-800">{g.name}</p>
                  <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                  <button onClick={()=>openDetails(g._id)} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Manage</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Global Groups</h3>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {globalGroups.map((g)=> (
                <div key={g._id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <p className="font-medium text-slate-800">{g.name}</p>
                  <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                  <button onClick={()=>openDetails(g._id)} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Manage</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Group Details</h4>
          {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
          {!selected ? (
            <p className="text-sm text-slate-600">Select a group to manage</p>
          ) : (
            <div>
              <p className="font-medium text-slate-800">{selected.name}</p>
              <p className="text-xs text-slate-600 mb-2">{selected.isGlobal ? 'Global' : `University: ${selected.university || '-'}`}</p>
              {!selected.isGlobal && (
                <div className="flex gap-2 mb-3">
                  <button onClick={onRename} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs">Rename</button>
                  <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs">Delete</button>
                </div>
              )}
              <div>
                <p className="font-medium text-slate-800 mb-2 text-sm">Members</p>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {selected.members?.map((m)=> (
                    <div key={m.user} className="flex items-center justify-between border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-800">{m.name}</p>
                        {m.isAnonymous && <p className="text-[11px] text-slate-500">Anonymous{m.alias?` • ${m.alias}`:''}</p>}
                      </div>
                      <button onClick={()=>onRemoveMember(m.user)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs hover:bg-slate-300">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="font-medium text-slate-800 mb-2 text-sm">Messages</p>
                <div className="border rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-auto p-3 space-y-2 bg-white">
                    {selected.messages?.length ? selected.messages.map(msg => {
                      const mine = msg.sender === user?._id;
                      return (
                        <div key={msg._id} className={`flex ${mine? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                            <p className="text-[11px] opacity-80 mb-0.5">{msg.senderName || 'Member'} • {new Date(msg.createdAt).toLocaleTimeString()}</p>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <div className="text-[10px] mt-1 flex justify-between items-center opacity-70">
                              <span></span>
                              {(mine || !selected.isGlobal) && (
                                <button onClick={async()=>{ try{ await deleteMessage(user?.token, selected._id, msg._id); const d=await getGroup(user?.token, selected._id); setSelected(d);}catch(e){alert('Failed to delete');}}} className={`hover:underline ${mine? 'text-white' : 'text-slate-600'}`}>Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-2 text-sm text-slate-500">No messages yet.</div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 flex gap-2">
                    <input value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder="Write a message..." className="flex-1 px-3 py-2 rounded-lg border text-sm" />
                    <button onClick={async()=>{ if(!messageText.trim())return; try{ await postMessage(user?.token, selected._id, messageText.trim()); setMessageText(""); const d=await getGroup(user?.token, selected._id); setSelected(d);}catch(e){alert('Failed to send');}}} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// removed private-group join request panel

export default AdminGroups;


