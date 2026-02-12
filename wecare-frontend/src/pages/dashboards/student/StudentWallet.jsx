import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getWalletBalance, getTransactionHistory, withdrawToMpesa } from "../../../services/walletService";
import { Wallet, Eye, EyeOff, ArrowDownRight, ArrowUpRight, Send, DollarSign, TrendingUp, TrendingDown, History, Phone, Hash, CheckCircle } from "lucide-react";

const StudentWallet = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Withdrawal states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWalletBalance(user?.token);
      setBalance(data.balance);
      setTotalReceived(data.totalReceived);
      setTotalWithdrawn(data.totalWithdrawn);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await getTransactionHistory(user?.token, 20);
      setTransactions(data.transactions);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  };

  useEffect(() => {
    if (user?.token) {
      loadWallet();
      loadTransactions();
    }
  }, [user?.token]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (withdrawAmount > balance) {
      setError("Insufficient balance");
      return;
    }
    if (!withdrawPhone || withdrawPhone.trim() === "") {
      setError("Enter M-Pesa phone number");
      return;
    }

    try {
      setError("");
      setWithdrawing(true);
      const result = await withdrawToMpesa(user?.token, parseFloat(withdrawAmount), withdrawPhone);
      setWithdrawSuccess(result);
      setWithdrawAmount("");
      setWithdrawPhone("");
      await loadWallet();
      await loadTransactions();
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading wallet...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Wallet Card */}
      <div className="rounded-2xl border-2 border-green-200 dark:border-green-800/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800/50 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-700 dark:text-green-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Your Wallet</h2>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors flex items-center gap-2"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showBalance ? "Hide Balance" : "Show Balance"}
          </button>
        </div>

        {/* Balance Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-green-200 dark:border-green-800/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Available Balance</p>
            </div>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300 ml-7">
              {showBalance ? `KES ${balance.toLocaleString()}` : "••••••"}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-blue-200 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Received</p>
            </div>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 ml-7">
              {showBalance ? `KES ${totalReceived.toLocaleString()}` : "••••••"}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-orange-200 dark:border-orange-800/50">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Withdrawn</p>
            </div>
            <p className="text-3xl font-bold text-orange-700 dark:text-orange-300 ml-7">
              {showBalance ? `KES ${totalWithdrawn.toLocaleString()}` : "••••••"}
            </p>
          </div>
        </div>

        {/* Withdraw Button */}
        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={balance <= 0}
          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          Withdraw to M-Pesa
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Transaction History</h3>
        </div>
        
        {transactions.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">No transactions yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  tx.type === "credit"
                    ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20"
                    : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20"
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {tx.type === "credit" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                    <span>{tx.type === "credit" ? "Received:" : "Withdrawn:"}</span>
                    <span className="text-slate-600 dark:text-slate-400">{tx.description}</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                  {tx.withdrawalRefId && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Ref: {tx.withdrawalRefId}
                    </p>
                  )}
                </div>
                <p className={`text-lg font-bold ml-4 ${
                  tx.type === "credit"
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}>
                  {tx.type === "credit" ? "+" : "-"}KES {tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-5 h-5 text-green-600" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Withdraw to M-Pesa</h3>
            </div>

            {withdrawSuccess ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg p-4 mb-6">
                <p className="text-green-700 dark:text-green-300 font-medium mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Withdrawal Successful!</p>
                <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                  KES {withdrawSuccess.amount.toLocaleString()} sent to {withdrawSuccess.phone}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Reference: {withdrawSuccess.refId}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">Available Balance:</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 ml-6">KES {balance.toLocaleString()}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Hash className="w-4 h-4" />Withdrawal Amount (KES)</label>
                    <input
                      type="number"
                      placeholder="1000"
                      min="100"
                      max={balance}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Min: KES 100, Max: KES {balance.toLocaleString()}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Phone className="w-4 h-4" />M-Pesa Phone Number</label>
                    <input
                      type="text"
                      placeholder="254712345678 or 0712345678"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Format: 254XXXXXXXXX or 07XXXXXXXXX</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    disabled={withdrawing}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {withdrawing ? "Processing..." : "Withdraw"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentWallet;
