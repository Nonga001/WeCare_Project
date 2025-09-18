import { useState } from "react";

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2.5 bg-slate-200 rounded-full">
    <div
      className="h-2.5 bg-emerald-600 rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const StudentProfile = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    university: "",
    studentId: "",
    studentEmail: "",
    course: "",
    year: "",
    childInfo: "",
    docFile: null,
  });

  const completion = [
    form.name,
    form.phone,
    form.university,
    form.studentId,
    form.studentEmail,
    form.course,
    form.year,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completion / 7) * 100);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit to API later
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <input name="university" placeholder="University" value={form.university} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Extended Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="studentId" placeholder="Student ID / Admission No." value={form.studentId} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <input name="studentEmail" placeholder="Student Email" value={form.studentEmail} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <input name="course" placeholder="Course" value={form.course} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <input name="year" placeholder="Year of Study" value={form.year} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <textarea name="childInfo" placeholder="Child details (optional)" value={form.childInfo} onChange={handleChange} className="sm:col-span-2 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Documents</h3>
            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <span className="text-sm text-slate-600">Student card / Admission letter</span>
                <input type="file" name="docFile" onChange={handleChange} className="mt-2 block w-full text-sm" />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700">Submit for Approval</button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Profile Completion</h4>
          <ProgressBar value={completionPercent} />
          <p className="mt-2 text-sm text-slate-600">{completionPercent}% complete</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Status</h4>
          <p className="text-slate-600 text-sm">Pending verification</p>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;


