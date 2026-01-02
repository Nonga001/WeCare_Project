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
  const [showOptions, setShowOptions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
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
    // Check if group has members other than the admin
    const memberCount = selected.members?.length || 0;
    const hasOnlyAdmin = memberCount === 0 || (memberCount === 1 && selected.members[0].user === user?._id);
    
    if (!hasOnlyAdmin) {
      alert("You cannot delete a group which still has members. Please remove all members before deleting the group.");
      return;
    }
    
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
        <div className="rounded-2xl border border-amber-200 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Create Group</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Group name" className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1 max-w-sm" />
            <button disabled={creating} onClick={onCreate} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 transition-all">{creating?"Creating...":"Create"}</button>
            <p className="text-sm text-amber-700 font-medium">Group will be created for your university</p>
          </div>
          
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Your University Groups</h3>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uniGroups.map((g)=> (
                <div key={g._id} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4 hover:shadow-lg transition-shadow">
                  <p className="font-medium text-amber-900">{g.name}</p>
                  <p className="text-sm text-amber-700">Members: {g.membersCount}</p>
                  <button onClick={()=>openDetails(g._id)} className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Manage</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Global Groups</h3>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {globalGroups.map((g)=> (
                <div key={g._id} className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4 hover:shadow-lg transition-shadow">
                  <p className="font-medium text-amber-900">{g.name}</p>
                  <p className="text-sm text-amber-700">Members: {g.membersCount}</p>
                  <button onClick={()=>openDetails(g._id)} className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Manage</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-2">Group Details</h4>
          {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
          {!selected ? (
            <p className="text-sm text-slate-600">Select a group to manage</p>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-800">{selected.name}</p>
                  <p className="text-xs text-slate-600">{selected.isGlobal ? 'Global' : `University: ${selected.university || '-'}`}</p>
                  <p className="text-xs text-amber-700 font-medium mt-1">{selected.members?.length || 0} Participants</p>
                </div>
                {!selected.isGlobal && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowOptions(!showOptions)} 
                      className="px-3 py-1.5 border border-amber-200 rounded-xl text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Options
                    </button>
                    {showOptions && (
                      <div className="absolute right-0 mt-1 w-40 rounded-xl border border-amber-200 bg-white shadow-lg z-10">
                        <button 
                          onClick={() => { onRename(); setShowOptions(false); }} 
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 rounded-t-xl"
                        >
                          Rename Group
                        </button>
                        <button 
                          onClick={() => { setShowMembers(true); setShowOptions(false); }} 
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50"
                        >
                          View Members
                        </button>
                        <button 
                          onClick={() => { onDelete(); setShowOptions(false); }} 
                          className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-b-xl"
                        >
                          Delete Group
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-5">
                <p className="font-medium text-slate-800 mb-2 text-sm">Messages</p>
                <div className="border border-amber-200 rounded-2xl overflow-hidden bg-white">
                  <div className="max-h-64 overflow-auto p-3 space-y-2">
                    {selected.messages?.length ? selected.messages.map(msg => {
                      const mine = !msg.isAIGenerated && String(msg.sender) === String(user?._id);
                      const isAI = msg.isAIGenerated;
                      return (
                        <div key={msg._id} className={`flex ${mine? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-sm' : 'bg-amber-50 text-slate-800 border border-amber-200 rounded-bl-sm'}`}>
                            <p className="text-[11px] opacity-80 mb-0.5">{isAI ? 'AI Assistant' : (msg.senderName || 'Member')} • {new Date(msg.createdAt).toLocaleTimeString()}</p>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <div className="text-[10px] mt-1 flex justify-between items-center opacity-70">
                              <span></span>
                              {(mine || isAI || !selected.isGlobal) && (
                                <button onClick={async()=>{ try{ await deleteMessage(user?.token, selected._id, msg._id); const d=await getGroup(user?.token, selected._id); setSelected(d);}catch(e){alert('Failed to delete');}}} className={`hover:underline ${mine? 'text-white' : 'text-amber-700'}`}>Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-2 text-sm text-slate-500">No messages yet.</div>
                    )}
                  </div>
                  <div className="p-3 bg-amber-50 border-t border-amber-200 flex gap-2">
                    <input value={messageText} onChange={(e)=>setMessageText(e.target.value)} placeholder="Write a message..." className="px-4 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 flex-1" />
                    <button onClick={async()=>{ if(!messageText.trim())return; try{ await postMessage(user?.token, selected._id, messageText.trim()); setMessageText(""); const d=await getGroup(user?.token, selected._id); setSelected(d);}catch(e){alert('Failed to send');}}} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Send</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showMembers && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-lg">Group Members</h3>
              <button 
                onClick={() => setShowMembers(false)} 
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">{selected.name}</p>
            <div className="space-y-2">
              {selected.members?.map((m)=> (
                <div key={m.user} className="flex items-center justify-between border border-amber-200 rounded-xl px-3 py-2 bg-amber-50">
                  <div>
                    <p className="text-sm text-slate-800">{m.name}</p>
                    {m.isAnonymous && <p className="text-[11px] text-slate-500">Anonymous{m.alias?` • ${m.alias}`:''}</p>}
                  </div>
                  <button onClick={()=>onRemoveMember(m.user)} className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// removed private-group join request panel

export default AdminGroups;


