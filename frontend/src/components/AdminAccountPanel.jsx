import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader, ShieldCheck, UserRoundPlus } from "lucide-react";
import api from "../lib/api";
import Modal from "./Modal";

const emptyForm = { full_name: "", email: "", phone: "", password: "" };

export default function AdminAccountPanel({ onMessage }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [replacementPassword, setReplacementPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin-users");
      setAccounts(response.data.users || []);
    } catch (error) {
      onMessage("Accounts Unavailable", error.response?.data?.message || "Could not load staff accounts.", "error");
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const createAccount = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin-users/staff", form);
      setForm(emptyForm);
      setShowCreate(false);
      await loadAccounts();
      onMessage("Staff Account Created", "The new staff member can now sign in.", "success");
    } catch (error) {
      onMessage("Account Not Created", error.response?.data?.message || "Could not create the staff account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (account) => {
    const status = account.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/admin-users/${account.id}/status`, { status });
      await loadAccounts();
      onMessage("Account Updated", `${account.full_name} is now ${status}.`, "success");
    } catch (error) {
      onMessage("Account Not Updated", error.response?.data?.message || "Could not change the account status.", "error");
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/admin-users/${passwordTarget.id}/password`, { password: replacementPassword });
      setPasswordTarget(null);
      setReplacementPassword("");
      onMessage("Password Reset", "Give the replacement password to the account owner privately.", "success");
    } catch (error) {
      onMessage("Password Not Reset", error.response?.data?.message || "Could not reset the password.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="medical-card flex justify-center p-10"><Loader className="animate-spin text-teal-600" /></div>;
  }

  return (
    <>
      <div className="medical-card p-5 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">Staff and Administrator Accounts</h2>
            <p className="mt-1 text-sm text-gray-500">Create reception accounts, control access, and issue replacement passwords.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 font-medium text-white hover:bg-teal-700">
            <UserRoundPlus size={19} /> New Staff Account
          </button>
        </div>

        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex flex-col gap-4 rounded-3xl border border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="rounded-2xl bg-teal-50 p-3 text-teal-700"><ShieldCheck size={23} /></span>
                <div>
                  <p className="font-semibold text-teal-950">{account.full_name}</p>
                  <p className="text-sm text-gray-600">{account.email} | {account.phone}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{account.role} - {account.status}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setPasswordTarget(account)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"><KeyRound size={16} /> Reset Password</button>
                <button type="button" disabled={account.id === currentUser.id} onClick={() => toggleStatus(account)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40">{account.status === "active" ? "Deactivate" : "Activate"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Staff Account">
        <form onSubmit={createAccount} className="space-y-4">
          {[['full_name', 'Full name', 'text'], ['email', 'Email address', 'email'], ['phone', 'Phone number', 'tel'], ['password', 'Temporary password', 'password']].map(([name, label, type]) => (
            <label key={name} className="block text-sm font-medium text-gray-700">{label}
              <input type={type} required minLength={name === 'password' ? 10 : undefined} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 focus:border-teal-600 focus:outline-none" />
            </label>
          ))}
          <button disabled={submitting} className="w-full rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{submitting ? "Creating..." : "Create Staff Account"}</button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(passwordTarget)} onClose={() => setPasswordTarget(null)} title="Reset Account Password">
        <form onSubmit={resetPassword} className="space-y-4">
          <p className="text-sm text-gray-600">Set a temporary password of at least 10 characters for {passwordTarget?.full_name}.</p>
          <input type="password" required minLength={10} value={replacementPassword} onChange={(event) => setReplacementPassword(event.target.value)} className="w-full rounded-2xl border border-gray-300 px-4 py-3 focus:border-teal-600 focus:outline-none" />
          <button disabled={submitting} className="w-full rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{submitting ? "Saving..." : "Reset Password"}</button>
        </form>
      </Modal>
    </>
  );
}
