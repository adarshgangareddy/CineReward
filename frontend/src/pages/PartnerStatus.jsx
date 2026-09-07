import { useState } from "react";
import axios from "axios";
import {
  Search,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

const PartnerStatus = () => {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);

  const checkStatus = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/partner/status?email=${email}`);
      setResults(res.data);
    } catch (err) {
      alert("Could not find any inquiries for this email.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Accepted":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Negotiating":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    setLoading(true);
    try {
      // 1. Create Order
      const orderRes = await axios.post(
        "/api/admin/partner/create-payment-order",
        {
          leadId: paymentModal._id,
          amount: paymentModal.paymentAmount,
        },
      );

      const { id: order_id, amount, currency, keyId } = orderRes.data;

      if (!keyId || typeof window.Razorpay !== "function") {
        throw new Error("Payment gateway is not configured or failed to load.");
      }

      // 2. Open Razorpay
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "CineReward Partnerships",
        description: `Partnership Payment for ${paymentModal.eventType}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(
              "/api/admin/partner/verify-payment",
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                leadId: paymentModal._id,
              },
            );

            if (verifyRes.data.success) {
              alert("Payment Successful! Your partnership is now active.");
              setPaymentModal(null);
              // Refresh status
              const res = await axios.get(
                `/api/admin/partner/status?email=${email}`,
              );
              setResults(res.data);
            }
          } catch (err) {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: paymentModal.name,
          email: paymentModal.email,
          contact: paymentModal.phone,
        },
        theme: { color: "#F43F5E" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initialization failed", err);
      alert("Could not initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-20 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-4">
            Track Your <span className="text-primary">Inquiry</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-xl mx-auto">
            Enter your email address to check the status of your partnership
            request and complete your payment.
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl">
          <form
            onSubmit={checkStatus}
            className="flex flex-col md:flex-row gap-4 mb-12"
          >
            <div className="flex-grow relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-6 py-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white font-black px-10 py-4 rounded-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Check Status"
              )}
            </button>
          </form>

          {results && results.length > 0 ? (
            <div className="space-y-6">
              {results.map((req) => (
                <div
                  key={req._id}
                  className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 md:p-8 hover:border-slate-700 transition-all group"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                          {req.eventType}
                        </h3>
                        <span
                          className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />{" "}
                          {new Date(req.eventDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />{" "}
                          {req.eventLocation?.split(",")[0] || "Location N/A"}
                        </div>
                      </div>
                    </div>

                    {req.status === "Accepted" &&
                      req.paymentStatus === "Unpaid" && (
                        <button
                          onClick={() => setPaymentModal(req)}
                          className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" /> Pay ₹
                          {req.paymentAmount}
                        </button>
                      )}

                    {req.paymentStatus === "Paid" && (
                      <div className="flex items-center gap-2 text-green-500 font-black text-xs uppercase tracking-widest">
                        <CheckCircle className="w-5 h-5" /> Payment Successful
                      </div>
                    )}
                  </div>

                  {req.adminMessage && (
                    <div className="mt-6 p-4 bg-slate-900/80 rounded-2xl border border-slate-800/50">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> Note from CineReward
                      </p>
                      <p className="text-slate-400 text-sm italic">
                        &quot;{req.adminMessage}&quot;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            results && (
              <div className="text-center py-20 bg-slate-800/20 rounded-[3rem] border border-dashed border-slate-800">
                <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">
                  No requests found for this email address.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-4"
          onClick={() => setPaymentModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-t-[3rem] md:rounded-[3rem] max-w-md w-full p-8 md:p-10 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <button
              onClick={() => setPaymentModal(null)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                Finalize Partnership
              </h3>
              <p className="text-slate-500 text-xs font-bold mt-2">
                Account: {paymentModal.name}
              </p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <span className="text-slate-400 text-xs font-black uppercase">
                  Payment Code
                </span>
                <span className="text-primary font-mono font-bold">
                  {paymentModal.paymentCode}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <span className="text-slate-400 text-xs font-black uppercase">
                  Amount to pay
                </span>
                <span className="text-white text-xl font-black tracking-tight">
                  ₹{paymentModal.paymentAmount}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                  Bank Transfer Details
                </p>
                <div className="space-y-3 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank:</span>{" "}
                    <span className="text-white">CineReward Ent.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Acc No:</span>{" "}
                    <span className="text-white">XXXX XXXX 1234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IFSC:</span>{" "}
                    <span className="text-white">CINI0001234</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Complete with Razorpay</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-500 font-bold italic uppercase tracking-widest">
                Secure Payment Powered by Razorpay
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerStatus;
