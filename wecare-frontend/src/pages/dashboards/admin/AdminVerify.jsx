import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { approveStudent, listStudentsForAdmin, rejectStudent } from "../../../services/userService";

const AdminVerify = () => {
  const { user } = useAuth();
  const token = user?.token;
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await listStudentsForAdmin(token);
      setStudents(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pendingRegistration = useMemo(() => students.filter(s => !s.isApproved && !s.profileSubmitted), [students]);
  const awaitingProfileVerification = useMemo(() => students.filter(s => s.isApproved && s.profileSubmitted && !s.profileApproved), [students]);
  const verifiedStudents = useMemo(() => students.filter(s => s.isApproved), [students]); // All approved students from university
  const approvedStudentMoms = useMemo(() => students.filter(s => s.isApproved && s.profileSubmitted && s.profileApproved), [students]);

  const handleApprove = async (id, studentName) => {
    if (window.confirm(`Are you sure you want to approve ${studentName}?`)) {
      try {
        await approveStudent(token, id);
        await fetchStudents();
        setError(""); // Clear any previous errors
      } catch (err) {
        setError(err.response?.data?.message || "Failed to approve student");
      }
    }
  };

  const handleReject = async (id, studentName) => {
    if (window.confirm(`Are you sure you want to reject ${studentName}? This action cannot be undone.`)) {
      try {
        await rejectStudent(token, id);
        await fetchStudents();
        setError(""); // Clear any previous errors
      } catch (err) {
        setError(err.response?.data?.message || "Failed to reject student");
      }
    }
  };

  const StudentCard = ({ student, showActions = false }) => (
    <div className="border border-slate-200 rounded-xl p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-slate-800 mb-2">{student.name}</h4>
          <p className="text-sm text-slate-600 mb-1"><strong>Email:</strong> {student.email}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Phone:</strong> {student.phone || 'Not provided'}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Student ID:</strong> {student.studentId || 'Not provided'}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Student Email:</strong> {student.studentEmail || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-sm text-slate-600 mb-1"><strong>Course:</strong> {student.course || 'Not provided'}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Year of Study:</strong> {student.yearOfStudy || 'Not provided'}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Child Details:</strong> {student.childDetails || 'Not provided'}</p>
          <p className="text-sm text-slate-600 mb-1"><strong>Documents:</strong> {student.documents ? 'Uploaded' : 'Not uploaded'}</p>
        </div>
      </div>
      {student.childDetails && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-700"><strong>Child Details:</strong> {student.childDetails}</p>
        </div>
      )}
      {showActions && (
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => handleApprove(student._id, student.name)} 
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            ✅ Approve
          </button>
          <button 
            onClick={() => handleReject(student._id, student.name)} 
            className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
          >
            ❌ Reject
          </button>
        </div>
      )}
    </div>
  );

  const StatusBadge = ({ status, type, student }) => {
    const getBadgeStyle = () => {
      if (type === 'profile') {
        return status ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
      }
      
      // Determine status based on student data
      if (!student.isApproved && !student.profileSubmitted) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      } else if (student.isApproved && student.profileSubmitted && !student.profileApproved) {
        return 'bg-orange-100 text-orange-800 border-orange-200';
      } else if (student.isApproved && student.profileSubmitted && student.profileApproved) {
        return 'bg-green-100 text-green-800 border-green-200';
      } else if (student.isApproved) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      }
      return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getStatusText = () => {
      if (type === 'profile') {
        return status ? '✅ Submitted' : '❌ Not Submitted';
      }
      
      if (!student.isApproved && !student.profileSubmitted) {
        return 'Unverified';
      } else if (student.isApproved && student.profileSubmitted && !student.profileApproved) {
        return 'Awaiting Verification';
      } else if (student.isApproved && student.profileSubmitted && student.profileApproved) {
        return 'Approved Student Mom';
      } else if (student.isApproved) {
        return 'Verified';
      }
      return 'Unknown';
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
        {getStatusText()}
      </span>
    );
  };

  const Table = ({ data, showActions, showProfileStatus = false, stage = 'pending' }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 bg-slate-50">
            <th className="py-3 px-4 font-medium">Name</th>
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Registered</th>
            {showProfileStatus && <th className="py-3 px-4 font-medium">Profile Status</th>}
            <th className="py-3 px-4 font-medium">Current Stage</th>
            {showActions && <th className="py-3 px-4 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s._id} className="border-t border-slate-200 hover:bg-slate-50">
              <td className="py-3 px-4 text-slate-800 font-medium">{s.name}</td>
              <td className="py-3 px-4 text-slate-600">{s.email}</td>
              <td className="py-3 px-4 text-slate-600">{new Date(s.createdAt).toLocaleDateString()}</td>
              {showProfileStatus && (
                <td className="py-3 px-4">
                  <StatusBadge status={s.profileSubmitted} type="profile" student={s} />
                </td>
              )}
              <td className="py-3 px-4">
                <StatusBadge 
                  status={stage} 
                  type="stage"
                  student={s}
                />
              </td>
              {showActions && (
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(s._id, s.name)} 
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition-colors"
                    >
                      ✅ Approve
                    </button>
                    <button 
                      onClick={() => handleReject(s._id, s.name)} 
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-medium transition-colors"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-xl ${tab === "pending" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Pending Registration</button>
        <button onClick={() => setTab("awaiting")} className={`px-4 py-2 rounded-xl ${tab === "awaiting" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Awaiting Profile Verification</button>
        <button onClick={() => setTab("verified")} className={`px-4 py-2 rounded-xl ${tab === "verified" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Verified Students</button>
        <button onClick={() => setTab("approved")} className={`px-4 py-2 rounded-xl ${tab === "approved" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Approved Student Moms</button>
      </div>
      <div className="rounded-xl border border-slate-200 p-5">
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : tab === "pending" ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📝 Pending Registration</h3>
            <p className="text-sm text-slate-600 mb-4">Students who have registered but haven't been approved yet</p>
            <Table data={pendingRegistration} showActions={true} showProfileStatus={true} stage="unverified" />
          </div>
        ) : tab === "awaiting" ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">⏳ Awaiting Profile Verification</h3>
            <p className="text-sm text-slate-600 mb-4">Verified students who completed their profile (100%) and are waiting for admin approval</p>
            {awaitingProfileVerification.length === 0 ? (
              <p className="text-slate-500">No students awaiting profile verification.</p>
            ) : (
              awaitingProfileVerification.map(student => (
                <StudentCard key={student._id} student={student} showActions={true} />
              ))
            )}
          </div>
        ) : tab === "verified" ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">✅ Verified Students</h3>
            <p className="text-sm text-slate-600 mb-4">All students from your university who are not pending verification (dynamic list)</p>
            <Table data={verifiedStudents} showActions={false} showProfileStatus={true} stage="verified" />
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">🎉 Approved Student Moms</h3>
            <p className="text-sm text-slate-600 mb-4">Students whose profile has been approved by admin - they can access all features</p>
            <Table data={approvedStudentMoms} showActions={false} showProfileStatus={true} stage="approved" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVerify;


