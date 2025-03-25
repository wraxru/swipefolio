import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { X, DollarSign, ChevronDown, ChevronUp, ChevronRight, Info, TrendingUp, Shield, Zap, ArrowRight, Check } from "lucide-react";
import { StockData } from "@/lib/stock-data";
import { usePortfolio } from "@/contexts/portfolio-context";
import { cn } from "@/lib/utils";

interface PortfolioImpactCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onInvest: () => void;
  stock: StockData;
}

export default function PortfolioImpactCalculator({
  isOpen,
  onClose,
  onInvest,
  stock,
}: PortfolioImpactCalculatorProps) {
  const { cash, calculateImpact, buyStock, isLoading } = usePortfolio();
  
  // State for investment amount - start with min $1
  const [investmentAmount, setInvestmentAmount] = useState<number>(1);
  const [showValueShares, setShowValueShares] = useState<boolean>(true); // true for value, false for shares
  
  // Calculate max investment (limited by cash)
  const maxInvestment = Math.min(cash, 100);
  
  // Calculate shares based on investment amount (minimum 0.001 shares)
  const shares = Math.max(investmentAmount / stock.price, 0.001);
  
  // Estimated value in 1 year (based on oneYearReturn if available)
  const estimatedValue = stock.oneYearReturn 
    ? investmentAmount * (1 + parseFloat(stock.oneYearReturn.replace("%", "")) / 100)
    : investmentAmount * 1.08; // Default 8% growth if no return data
  
  // Calculate portfolio impact with validation
  const impact = calculateImpact(stock, investmentAmount);
  
  // Function to format metric change with colored arrow
  const formatMetricChange = (value: number) => {
    const formatted = value.toFixed(1);
    if (value > 0) {
      return <span className="text-green-500 flex items-center"><ChevronUp size={16} />{formatted}</span>;
    } else if (value < 0) {
      return <span className="text-red-500 flex items-center"><ChevronDown size={16} />{Math.abs(parseFloat(formatted))}</span>;
    } else {
      return <span className="text-gray-500">0</span>;
    }
  };
  
  // Function to get icon for metric
  const getMetricIcon = (metricName: string, size: number = 16) => {
    switch (metricName.toLowerCase()) {
      case "performance":
        return <TrendingUp size={size} />;
      case "value":
        return <DollarSign size={size} />;
      case "stability":
        return <Shield size={size} />;
      case "momentum":
        return <Zap size={size} />;
      default:
        return <Info size={size} />;
    }
  };
  
  // Handle investment amount changes
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setInvestmentAmount(Math.min(value, maxInvestment));
    }
  };
  
  // Handle increment/decrement buttons
  const incrementAmount = () => {
    setInvestmentAmount(prev => Math.min(prev + 1, maxInvestment));
  };
  
  const decrementAmount = () => {
    setInvestmentAmount(prev => Math.max(prev - 1, 1));
  };
  
  // Handle invest action
  const handleInvest = () => {
    buyStock(stock, investmentAmount);
    onInvest();
    onClose();
  };
  
  // Format number for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage for display
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="calculator-overlay"
            onClick={onClose}
          />
          
          {/* Modal with enhanced animations and better centering */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: { 
                type: "spring", 
                damping: 30, 
                stiffness: 350,
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1]
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95, 
              y: 20,
              transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] }
            }}
            className="calculator-modal"
            style={{
              boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.25), 0 12px 25px -10px rgba(0, 0, 0, 0.1)',
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '450px'
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-b from-white to-slate-50">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-2 rounded-lg mr-3 shadow-md flex items-center justify-center w-10 h-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    <path d="M12 22V4"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Portfolio: {formatCurrency(cash)}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {stock.name} ({stock.ticker})
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5">
              <div className="mb-6">
                <h3 className="text-center font-bold text-lg text-slate-800 mb-4">
                  Portfolio Impact Calculator
                </h3>
                
                {/* Pie Chart showing industry allocation */}
                <div className="relative h-48 mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" width="200" height="200">
                      {/* Background circle - lighter when empty */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke={Object.keys(impact.industryAllocation).length === 0 ? "#f3f4f6" : "#e5e7eb"} 
                        strokeWidth="20" 
                      />
                      
                      {/* Dynamic segments - only rendered when data exists */}
                      {Object.entries(impact.industryAllocation).length > 0 && 
                        Object.entries(impact.industryAllocation).map(([industry, allocation], index) => {
                          // Calculate segment parameters
                          const colors = ["#06b6d4", "#8b5cf6", "#fbbf24", "#34d399", "#f87171"];
                          const color = colors[index % colors.length];
                          const segmentPct = allocation.new;
                          const circumference = 2 * Math.PI * 40;
                          const previousSegments = Object.entries(impact.industryAllocation)
                            .slice(0, index)
                            .reduce((sum, [_, alloc]) => sum + alloc.new, 0);
                          const rotation = (previousSegments * 3.6) - 90; // -90 to start at top
                          
                          // Only render segments with actual percentage values
                          return segmentPct > 0 ? (
                            <circle 
                              key={industry}
                              cx="50" 
                              cy="50" 
                              r="40" 
                              fill="none" 
                              stroke={color} 
                              strokeWidth="20"
                              strokeDasharray={`${circumference * (segmentPct / 100)} ${circumference}`}
                              transform={`rotate(${rotation} 50 50)`}
                              strokeLinecap="butt"
                            />
                          ) : null;
                        })
                      }
                      
                      {/* Central circle */}
                      <circle cx="50" cy="50" r="30" fill="white" />
                      
                      {/* If no allocations, show empty state text */}
                      {Object.entries(impact.industryAllocation).length === 0 && (
                        <text 
                          x="50" 
                          y="53" 
                          textAnchor="middle" 
                          fontSize="8" 
                          fill="#6b7280"
                        >
                          First investment
                        </text>
                      )}
                    </svg>
                  </div>
                  
                  {/* Legend - moved to the left for better visibility and with background labels */}
                  {Object.entries(impact.industryAllocation).length > 0 && (
                    <div className="absolute top-[50%] -translate-y-1/2 left-2 text-sm flex flex-col gap-2">
                      {Object.entries(impact.industryAllocation).map(([industry, allocation], index) => {
                        const colors = ["#06b6d4", "#8b5cf6", "#fbbf24", "#34d399", "#f87171"];
                        const color = colors[index % colors.length];
                        
                        // Only show legend items with actual values and handle Real Estate positioning separately
                        return allocation.new > 0 ? (
                          <div 
                            key={industry} 
                            className={cn(
                              "flex items-center px-2 py-1 rounded-md shadow-sm font-medium",
                              industry === "Real Estate" ? "bg-white/90 border border-slate-100" : "bg-white/90 border border-slate-100"
                            )}
                            style={{
                              // Adjust Real Estate position to not cover the pie chart
                              marginLeft: industry === "Real Estate" ? "-10px" : "0px"
                            }}
                          >
                            <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: color }}></div>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center">
                                <span className="mr-1 text-xs text-slate-700 font-medium">{industry}</span>
                                <span className="font-bold text-xs text-slate-900">{formatPercentage(allocation.new)}</span>
                              </div>
                              {/* Only show change indicator when there's a difference */}
                              {allocation.new !== allocation.current && Math.abs(allocation.new - allocation.current) > 0.1 && (
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  allocation.new > allocation.current ? "text-green-600" : "text-red-600"
                                )}>
                                  {allocation.new > allocation.current ? "+" : ""}
                                  {formatPercentage(allocation.new - allocation.current)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                
                {/* Metric Comparisons */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {Object.entries(impact.impact).map(([metric, change]) => (
                    <div 
                      key={metric} 
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center mb-2">
                        <div className={`p-1.5 rounded-md mr-2 ${
                          change >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}>
                          {getMetricIcon(metric)}
                        </div>
                        <h4 className="font-semibold text-sm capitalize">{metric}</h4>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xs text-slate-500 mr-1">From</span>
                          <div className="font-semibold">
                            {impact.currentMetrics[metric as keyof typeof impact.currentMetrics].toFixed(1)}
                          </div>
                        </div>
                        
                        <div className="font-bold text-lg mx-2">→</div>
                        
                        <div className="flex items-center">
                          <span className="text-xs text-slate-500 mr-1">To</span>
                          <div className="font-semibold">
                            {impact.newMetrics[metric as keyof typeof impact.newMetrics].toFixed(1)}
                          </div>
                        </div>
                        
                        <div className="ml-3 font-bold">
                          {formatMetricChange(change)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Investment Amount Controls */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Investment Amount</h3>
                    <div className="flex items-center">
                      <button 
                        className={`px-3 py-1 text-xs rounded-l-lg border ${
                          showValueShares ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500 border-slate-200'
                        }`}
                        onClick={() => setShowValueShares(true)}
                      >
                        Value
                      </button>
                      <button 
                        className={`px-3 py-1 text-xs rounded-r-lg border ${
                          !showValueShares ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-500 border-slate-200'
                        }`}
                        onClick={() => setShowValueShares(false)}
                      >
                        Shares
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-full text-slate-700 hover:bg-slate-200 transition-colors"
                      onClick={decrementAmount}
                      disabled={investmentAmount <= 1}
                    >
                      <ChevronDown size={20} />
                    </button>
                    
                    <div className="relative">
                      <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none">
                        <DollarSign size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="number"
                        value={investmentAmount}
                        onChange={handleAmountChange}
                        min={1}
                        max={maxInvestment}
                        step={1}
                        className="w-28 h-12 text-center text-xl font-bold pl-8 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <button 
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-full text-slate-700 hover:bg-slate-200 transition-colors"
                      onClick={incrementAmount}
                      disabled={investmentAmount >= maxInvestment}
                    >
                      <ChevronUp size={20} />
                    </button>
                  </div>
                  
                  <div className="text-center text-sm text-slate-600 mb-3">
                    {showValueShares ? (
                      <span>Approx. {shares.toFixed(4)} shares @ {formatCurrency(stock.price)}</span>
                    ) : (
                      <span>Value: {formatCurrency(shares * stock.price)}</span>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3 text-blue-800 text-sm flex items-center">
                    <Info size={16} className="mr-2 text-blue-500" />
                    Est. Value in 1Y: {formatCurrency(estimatedValue)}
                  </div>
                </div>
                
                {/* Slide-to-Invest Component - More interactive and engaging */}
                {isLoading ? (
                  <motion.div 
                    className="invest-button flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.02, 1],
                      opacity: [0.9, 1, 0.9]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 1.5
                    }}
                  >
                    <svg className="animate-spin mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </motion.div>
                ) : (
                  <SlideToInvest 
                    onComplete={handleInvest}
                    disabled={investmentAmount <= 0 || investmentAmount > cash}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}