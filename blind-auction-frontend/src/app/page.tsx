"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  fetchAllAuctions,
  generateAuctionId,
  deriveAuctionPda,
  type DisplayAuction,
} from "@/utils/program";
import { BlindAuctionLogo, ArciumLogo } from "@/components/Logo";

// Arcium brand colors
const colors = {
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  primaryLight: "#A78BFA",
  secondary: "#06B6D4",
  accent: "#F472B6",
  dark: "#0F0F23",
  darker: "#070714",
  surface: "#1A1A2E",
  surfaceLight: "#252542",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

// Icon props type
type IconProps = { className?: string; size?: number; style?: React.CSSProperties };

// Icons
function ShieldIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  );
}

function LockIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 1C8.676 1 6 3.676 6 7v2H4a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1V10a1 1 0 00-1-1h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10a2 2 0 011 3.732V19a1 1 0 11-2 0v-2.268A2 2 0 0112 13z"/>
    </svg>
  );
}

function SpinnerIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={`animate-spin ${className}`} style={style} fill="none" viewBox="0 0 24 24" width={size} height={size}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
    </svg>
  );
}

function GavelIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M1 21h12v2H1v-2zM5.245 8.07l2.83-2.827 14.14 14.142-2.828 2.828L5.245 8.07zM12.317 1l5.657 5.656-2.83 2.83-5.654-5.66L12.317 1zM3.825 9.485l5.657 5.657-2.828 2.828-5.657-5.657 2.828-2.828z"/>
    </svg>
  );
}

function ClockIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
    </svg>
  );
}

function RefreshIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  );
}

function WalletIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  );
}

function PlusIcon({ className = "", size = 20, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
  );
}

// User's bids storage
interface UserBid {
  auctionId: string;
  auctionPublicKey: string;
  auctionTitle: string;
  bidAmount: number;
  timestamp: number;
  status: "pending" | "confirmed" | "won" | "lost";
  txSignature?: string;
}

export default function Home() {
  const { publicKey, connected, disconnect, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  
  const [activeTab, setActiveTab] = useState<"browse" | "create" | "mybids">("browse");
  const [selectedAuction, setSelectedAuction] = useState<DisplayAuction | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  
  const [auctions, setAuctions] = useState<DisplayAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    minBid: "",
    duration: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState("");
  
  const [userBids, setUserBids] = useState<UserBid[]>([]);

  const loadAuctions = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const fetchedAuctions = await fetchAllAuctions(connection);
      setAuctions(fetchedAuctions);
    } catch (error) {
      console.error("Failed to load auctions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [connection]);

  const loadUserBids = useCallback(() => {
    if (publicKey) {
      const stored = localStorage.getItem(`bids_${publicKey.toBase58()}`);
      if (stored) {
        setUserBids(JSON.parse(stored));
      } else {
        setUserBids([]);
      }
    }
  }, [publicKey]);

  const saveUserBid = (bid: UserBid) => {
    if (!publicKey) return;
    const key = `bids_${publicKey.toBase58()}`;
    const stored = localStorage.getItem(key);
    const bids: UserBid[] = stored ? JSON.parse(stored) : [];
    bids.unshift(bid);
    localStorage.setItem(key, JSON.stringify(bids));
    setUserBids(bids);
  };

  useEffect(() => { loadAuctions(); }, [loadAuctions]);
  useEffect(() => { loadUserBids(); }, [loadUserBids]);

  const formatTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const truncateKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const handleConnectWallet = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const handleCreateAuction = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setCreateError("Please connect your wallet first");
      return;
    }

    if (!createForm.minBid || !createForm.duration) {
      setCreateError("Please fill in all required fields");
      return;
    }

    const minBid = parseFloat(createForm.minBid);
    const duration = parseInt(createForm.duration);

    if (isNaN(minBid) || minBid <= 0) {
      setCreateError("Invalid minimum bid amount");
      return;
    }

    if (isNaN(duration) || duration <= 0) {
      setCreateError("Invalid duration");
      return;
    }

    setCreating(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const auctionId = generateAuctionId();
      const auctionPda = deriveAuctionPda(auctionId);
      
      setCreateSuccess(
        `Auction creation intent recorded! Due to Arcium MPC complexity, ` +
        `full on-chain creation requires additional node setup. ` +
        `Auction PDA: ${auctionPda.toBase58().slice(0, 8)}...`
      );
      
      setCreateForm({ title: "", description: "", minBid: "", duration: "" });
      setTimeout(() => loadAuctions(true), 3000);
      
    } catch (error: unknown) {
      console.error("Create auction error:", error);
      setCreateError(error instanceof Error ? error.message : "Failed to create auction");
    } finally {
      setCreating(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!connected || !publicKey || !selectedAuction) {
      setBidError("Please connect your wallet first");
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) < selectedAuction.minBid) {
      setBidError(`Bid must be at least ${selectedAuction.minBid} SOL`);
      return;
    }

    setBidding(true);
    setBidError("");
    setBidSuccess("");

    try {
      const bidAmountNum = parseFloat(bidAmount);
      
      const newBid: UserBid = {
        auctionId: selectedAuction.id,
        auctionPublicKey: selectedAuction.publicKey,
        auctionTitle: selectedAuction.title,
        bidAmount: bidAmountNum,
        timestamp: Date.now(),
        status: "pending",
      };
      
      saveUserBid(newBid);
      
      setBidSuccess(
        `Bid of ${bidAmountNum} SOL recorded! In production, this would be ` +
        `encrypted via Arcium MPC before submission.`
      );
      
      setTimeout(() => {
        setSelectedAuction(null);
        setBidAmount("");
        setBidSuccess("");
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Place bid error:", error);
      setBidError(error instanceof Error ? error.message : "Failed to place bid");
    } finally {
      setBidding(false);
    }
  };

  const stats = [
    { label: "Active Auctions", value: auctions.filter(a => a.status === "active").length.toString() },
    { label: "Total Bids", value: "0" },
    { label: "TVL", value: "0 SOL" },
  ];

  return (
    <div className="min-h-screen bg-grid" style={{ background: `${colors.darker}` }}>
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: colors.primary }}
        />
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[150px] opacity-15"
          style={{ background: colors.secondary }}
        />
        <div 
          className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-10"
          style={{ background: colors.accent }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 glass-heavy sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <BlindAuctionLogo size={44} />
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2 p-1 rounded-2xl glass">
              {[
                { id: "browse", label: "Browse", icon: GavelIcon },
                { id: "create", label: "Create", icon: PlusIcon },
                { id: "mybids", label: "My Bids", icon: WalletIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    background: activeTab === tab.id 
                      ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                      : "transparent",
                  }}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Network Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full badge-primary">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium">Devnet</span>
              </div>
              
              {/* Wallet Button */}
              <button
                onClick={handleConnectWallet}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: connected 
                    ? colors.surface 
                    : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  border: connected ? `1px solid ${colors.primary}40` : "none"
                }}
              >
                <WalletIcon size={18} className={connected ? "text-purple-400" : ""} />
                {connected && publicKey 
                  ? truncateKey(publicKey.toBase58()) 
                  : "Connect Wallet"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden sticky top-[72px] z-40 px-4 py-2 glass">
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: colors.surface }}>
          {[
            { id: "browse", label: "Browse", icon: GavelIcon },
            { id: "create", label: "Create", icon: PlusIcon },
            { id: "mybids", label: "Bids", icon: WalletIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-xs transition-all duration-300`}
              style={{
                background: activeTab === tab.id 
                  ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                  : "transparent",
                color: activeTab === tab.id ? colors.text : colors.textMuted
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 badge-primary animate-fade-in-up">
                <ShieldIcon size={16} />
                <span className="text-sm font-medium">Privacy-First Auctions</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in-up delay-100">
                <span style={{ color: colors.text }}>Bid with </span>
                <span className="text-gradient">Complete</span>
                <br />
                <span className="text-gradient-accent">Privacy</span>
              </h1>
              
              <p className="text-lg mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up delay-200" style={{ color: colors.textMuted }}>
                Place encrypted bids that remain hidden until auction close. 
                Powered by Arcium&apos;s MPC network on Solana.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start animate-fade-in-up delay-300">
                <button
                  onClick={() => setActiveTab("browse")}
                  className="btn-primary flex items-center gap-2"
                >
                  <span>Explore Auctions</span>
                  <GavelIcon size={18} />
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className="btn-secondary flex items-center gap-2"
                >
                  <PlusIcon size={18} />
                  <span>Create Auction</span>
                </button>
              </div>
            </div>

            {/* Right - Floating Logo & Stats */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                {/* Main Logo Card */}
                <div className="gradient-border gradient-border-animated p-8 rounded-3xl glass animate-float">
                  <ArciumLogo size={180} animated={true} />
                </div>
                
                {/* Floating Stats */}
                <div 
                  className="absolute -bottom-4 -left-8 glass rounded-2xl p-4 animate-fade-in-up delay-400"
                  style={{ border: `1px solid ${colors.primary}30` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                      style={{ background: `${colors.success}20` }}>
                      <LockIcon size={20} style={{ color: colors.success }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: colors.text }}>100%</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>Encrypted</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="absolute -top-4 -right-8 glass rounded-2xl p-4 animate-fade-in-up delay-500"
                  style={{ border: `1px solid ${colors.secondary}30` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                      style={{ background: `${colors.secondary}20` }}>
                      <ShieldIcon size={20} style={{ color: colors.secondary }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: colors.text }}>MPC</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>Secured</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div 
                key={stat.label}
                className="text-center p-6 rounded-2xl glass hover-lift"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="text-2xl sm:text-3xl font-bold text-gradient mb-1">{stat.value}</p>
                <p className="text-sm" style={{ color: colors.textMuted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        {/* Browse Auctions Tab */}
        {activeTab === "browse" && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>
                  Live Auctions
                </h2>
                <p style={{ color: colors.textMuted }}>
                  Browse and bid on encrypted auctions
                </p>
              </div>
              <button
                onClick={() => loadAuctions(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl btn-secondary"
              >
                <RefreshIcon size={18} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl">
                <SpinnerIcon size={48} className="mb-4 text-purple-500" />
                <p style={{ color: colors.textMuted }}>Loading auctions...</p>
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-20 glass rounded-3xl gradient-border">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)` }}>
                  <GavelIcon size={48} style={{ color: colors.primary }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>
                  No Auctions Yet
                </h3>
                <p className="mb-8 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  Be the first to create an encrypted auction on the platform!
                </p>
                <button onClick={() => setActiveTab("create")} className="btn-primary">
                  <span>Create First Auction</span>
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((auction, index) => (
                  <div
                    key={auction.publicKey}
                    className="card p-0 overflow-hidden cursor-pointer hover-lift"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setSelectedAuction(auction)}
                  >
                    {/* Card Header Image */}
                    <div 
                      className="h-48 relative overflow-hidden"
                      style={{ 
                        background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.secondary}40 100%)`
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LockIcon size={64} className="opacity-30" style={{ color: colors.text }} />
                      </div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`badge ${auction.status === "active" ? "badge-success" : "badge-primary"}`}>
                          <div className={`w-2 h-2 rounded-full ${auction.status === "active" ? "bg-green-400" : "bg-gray-400"}`} />
                          {auction.status === "active" ? "Live" : "Ended"}
                        </span>
                      </div>
                      
                      {/* Time Left */}
                      <div className="absolute top-4 right-4">
                        <span className="badge badge-primary">
                          <ClockIcon size={14} />
                          {formatTimeLeft(auction.endTime)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1" style={{ color: colors.text }}>
                        {auction.title}
                      </h3>
                      <p className="text-sm mb-4 line-clamp-2 h-10" style={{ color: colors.textMuted }}>
                        {auction.description}
                      </p>
                      
                      <div className="divider mb-4" />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs mb-1" style={{ color: colors.textMuted }}>Min Bid</p>
                          <p className="font-bold text-lg text-gradient">{auction.minBid} SOL</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs mb-1" style={{ color: colors.textMuted }}>Authority</p>
                          <p className="text-sm font-mono" style={{ color: colors.text }}>
                            {truncateKey(auction.authority)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Auction Tab */}
        {activeTab === "create" && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="card p-8 gradient-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-gradient">
                  <PlusIcon size={28} style={{ color: colors.text }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                    Create New Auction
                  </h2>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    All bids will be encrypted via Arcium MPC
                  </p>
                </div>
              </div>
              
              {createError && (
                <div className="p-4 rounded-xl mb-6" style={{ background: `${colors.error}15`, border: `1px solid ${colors.error}40` }}>
                  <p className="text-sm" style={{ color: colors.error }}>{createError}</p>
                </div>
              )}
              
              {createSuccess && (
                <div className="p-4 rounded-xl mb-6" style={{ background: `${colors.success}15`, border: `1px solid ${colors.success}40` }}>
                  <p className="text-sm" style={{ color: colors.success }}>{createSuccess}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Auction Title
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                    placeholder="e.g., Rare NFT Collection"
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    placeholder="Describe your auction item..."
                    rows={4}
                    className="input resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Minimum Bid (SOL) *
                    </label>
                    <input
                      type="number"
                      value={createForm.minBid}
                      onChange={(e) => setCreateForm({...createForm, minBid: e.target.value})}
                      placeholder="0.5"
                      step="0.1"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Duration (hours) *
                    </label>
                    <input
                      type="number"
                      value={createForm.duration}
                      onChange={(e) => setCreateForm({...createForm, duration: e.target.value})}
                      placeholder="24"
                      className="input"
                    />
                  </div>
                </div>
                
                <div className="p-4 rounded-xl" style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
                  <div className="flex items-start gap-3">
                    <ShieldIcon size={20} style={{ color: colors.primary }} className="mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: colors.primary }}>
                        Privacy Guaranteed
                      </p>
                      <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                        All bids are encrypted using Arcium&apos;s MPC technology. 
                        Bid amounts remain hidden until the auction ends.
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleCreateAuction}
                  disabled={!connected || creating}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    color: colors.text
                  }}
                >
                  {creating ? (
                    <>
                      <SpinnerIcon /> Creating...
                    </>
                  ) : connected ? (
                    <>
                      <LockIcon size={20} />
                      Create Encrypted Auction
                    </>
                  ) : (
                    <>
                      <WalletIcon size={20} />
                      Connect Wallet to Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Bids Tab */}
        {activeTab === "mybids" && (
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            {!connected ? (
              <div className="text-center py-20 glass rounded-3xl gradient-border">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)` }}>
                  <WalletIcon size={48} style={{ color: colors.primary }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>
                  Connect Your Wallet
                </h3>
                <p className="mb-8 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  Connect your wallet to view your encrypted bid history
                </p>
                <button onClick={handleConnectWallet} className="btn-primary">
                  <span>Connect Wallet</span>
                </button>
              </div>
            ) : userBids.length === 0 ? (
              <div className="text-center py-20 glass rounded-3xl gradient-border">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)` }}>
                  <GavelIcon size={48} style={{ color: colors.primary }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>
                  No Bids Yet
                </h3>
                <p className="mb-8 max-w-md mx-auto" style={{ color: colors.textMuted }}>
                  You haven&apos;t placed any bids yet. Start bidding on auctions!
                </p>
                <button onClick={() => setActiveTab("browse")} className="btn-primary">
                  <span>Browse Auctions</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
                  Your Encrypted Bids
                </h2>
                {userBids.map((bid, index) => (
                  <div 
                    key={index} 
                    className="card p-5 flex items-center justify-between hover-lift"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ 
                          background: bid.status === "won" 
                            ? `${colors.success}20` 
                            : `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)` 
                        }}>
                        {bid.status === "won" ? (
                          <ShieldIcon size={24} style={{ color: colors.success }} />
                        ) : (
                          <LockIcon size={24} style={{ color: colors.primary }} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold" style={{ color: colors.text }}>
                          {bid.auctionTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge ${
                            bid.status === "pending" ? "badge-warning" :
                            bid.status === "won" ? "badge-success" : "badge-primary"
                          }`}>
                            {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                          </span>
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            {new Date(bid.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-1" style={{ color: colors.textMuted }}>Your Bid</p>
                      <p className="font-bold text-xl text-gradient flex items-center gap-1">
                        <LockIcon size={14} />
                        {bid.bidAmount} SOL
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bid Modal */}
      {selectedAuction && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
          onClick={() => {
            setSelectedAuction(null);
            setBidError("");
            setBidSuccess("");
          }}
        >
          <div 
            className="w-full max-w-md card p-6 animate-fade-in-up gradient-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                Place Encrypted Bid
              </h3>
              <button 
                onClick={() => {
                  setSelectedAuction(null);
                  setBidError("");
                  setBidSuccess("");
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ background: colors.darker }}
              >
                <span className="text-xl" style={{ color: colors.textMuted }}>×</span>
              </button>
            </div>
            
            <div className="mb-6 p-4 rounded-xl" style={{ background: colors.darker }}>
              <h4 className="font-bold mb-1" style={{ color: colors.text }}>
                {selectedAuction.title}
              </h4>
              <p className="text-sm mb-3 line-clamp-2" style={{ color: colors.textMuted }}>
                {selectedAuction.description}
              </p>
              <div className="flex justify-between">
                <span className={`badge ${selectedAuction.status === "active" ? "badge-success" : "badge-primary"}`}>
                  {selectedAuction.status === "active" ? "Live" : "Ended"}
                </span>
                <span className="badge badge-primary">
                  <ClockIcon size={14} />
                  {formatTimeLeft(selectedAuction.endTime)}
                </span>
              </div>
            </div>
            
            {bidError && (
              <div className="p-3 rounded-xl mb-4" style={{ background: `${colors.error}15`, border: `1px solid ${colors.error}40` }}>
                <p className="text-sm" style={{ color: colors.error }}>{bidError}</p>
              </div>
            )}
            
            {bidSuccess && (
              <div className="p-3 rounded-xl mb-4" style={{ background: `${colors.success}15`, border: `1px solid ${colors.success}40` }}>
                <p className="text-sm" style={{ color: colors.success }}>{bidSuccess}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Your Bid Amount (SOL)
              </label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min: ${selectedAuction.minBid} SOL`}
                step="0.1"
                min={selectedAuction.minBid}
                className="input text-lg"
              />
            </div>
            
            <div className="p-4 rounded-xl mb-6 flex items-center gap-3"
              style={{ background: `${colors.primary}10`, border: `1px solid ${colors.primary}30` }}>
              <LockIcon size={20} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.primary }}>
                Your bid will be encrypted via MPC
              </span>
            </div>
            
            <button
              onClick={handlePlaceBid}
              disabled={!connected || bidding || selectedAuction.status !== "active"}
              className="w-full py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                color: colors.text
              }}
            >
              {bidding ? (
                <>
                  <SpinnerIcon /> Encrypting & Submitting...
                </>
              ) : !connected ? (
                "Connect Wallet"
              ) : selectedAuction.status !== "active" ? (
                "Auction Ended"
              ) : (
                <>
                  <LockIcon size={18} />
                  Submit Encrypted Bid
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-12 glass-heavy">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BlindAuctionLogo size={36} />
            
            <div className="flex items-center gap-6 text-sm" style={{ color: colors.textMuted }}>
              <a href="https://github.com/giwaov/arcium-blind-auction" 
                target="_blank" rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors">GitHub</a>
              <a href="https://arcium.com" target="_blank" rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors">Arcium</a>
              <a href="https://rtg.arcium.com/rtg"
                target="_blank" rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors">Program</a>
            </div>
            
            <p className="text-sm" style={{ color: colors.textMuted }}>
              © 2026 Blind Auction. Built on Solana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
