import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listGroups, joinGroup, leaveGroup } from "../../../services/groupService";

const StudentSupport = () => {
  const { user } = useAuth();
  const [uniGroups, setUniGroups] = useState([]);
  const [globalGroups, setGlobalGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    } catch (e) {
      setError(e.response?.data?.message || "Failed to join");
    }
  };
  const onLeave = async (id) => {
    try {
      await leaveGroup(user?.token, id);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to leave");
    }
  };

  // removed request-join flow

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Peer Groups</h3>
          {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
          {loading ? (
            <p className="text-sm text-slate-500">Loading groups...</p>
          ) : (
            <>
              <h4 className="text-slate-700 font-medium mb-2">Your University</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {uniGroups.map((g) => (
                  <div key={g._id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                    {g.isMember ? (
                      <div className="mt-3">
                        <button onClick={()=>onLeave(g._id)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700">Leave Group</button>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button onClick={()=>onJoin(g._id, false)} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700">Join Publicly</button>
                        <button onClick={()=>onJoin(g._id, true)} className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-700">Join Anonymous</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <h4 className="text-slate-700 font-medium mb-2">Global Groups</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {globalGroups.map((g) => (
                  <div key={g._id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-sm text-slate-600">Members: {g.membersCount}</p>
                    {g.isMember ? (
                      <div className="mt-3">
                        <button onClick={()=>onLeave(g._id)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700">Leave Group</button>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button onClick={()=>onJoin(g._id, false)} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700">Join Publicly</button>
                        <button onClick={()=>onJoin(g._id, true)} className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-700">Join Anonymous</button>
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


