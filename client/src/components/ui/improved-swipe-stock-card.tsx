import { useState, useEffect, useRef, useMemo } from "react";
import { StockData } from "@/lib/stock-data";
import { getIndustryAverages } from "@/lib/industry-data";
import { Star, Info, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from "framer-motion";
import MetricPopup from "./metric-popup-fixed";
import OverallAnalysisCard from "@/components/overall-analysis-card";

interface SwipeStockCardProps {
  stock: StockData;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalCount: number;
  nextStock?: StockData; // Optional next stock to show during swipes
}

type TimeFrame = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

// Helper to generate new chart data based on the selected time frame
const generateTimeBasedData = (data: number[], timeFrame: TimeFrame) => {
  // Create variations of the chart data based on timeframe
  switch(timeFrame) {
    case "1D":
      // 1-day data will be more volatile with hourly fluctuations
      return data.map((point, i) => point * (1 + Math.sin(i * 0.5) * 0.03));
    case "5D":
      // 5-day data will have bigger swings
      return data.map((point, i) => point * (1 + Math.sin(i * 0.3) * 0.05));
    case "1M":
      // Default monthly data
      return data;
    case "6M":
      // 6-month data will be smoother with an overall trend
      return data.map((point, i) => point * (1 + (i/data.length) * 0.1));
    case "1Y":
      // 1-year data with more pronounced trends
      return data.map((point, i) => point * (1 + Math.sin(i * 0.2) * 0.08 + (i/data.length) * 0.15));
    case "5Y":
      // 5-year data with longer cycles
      return data.map((point, i) => point * (1 + Math.sin(i * 0.1) * 0.12 + (i/data.length) * 0.3));
    case "MAX":
      // Lifetime data with very long cycles 
      return data.map((point, i) => point * (1 + Math.sin(i * 0.05) * 0.15 + (i/data.length) * 0.5));
    default:
      return data;
  }
};

// Function to get time scale labels based on timeframe
const getTimeScaleLabels = (timeFrame: TimeFrame): string[] => {
  switch(timeFrame) {
    case "1D":
      return ["9:30", "11:00", "12:30", "14:00", "15:30", "16:00"];
    case "5D":
      return ["Mon", "Tue", "Wed", "Thu", "Fri"];
    case "1M":
      return ["Week 1", "Week 2", "Week 3", "Week 4"];
    case "6M":
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    case "YTD":
      return ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
    case "1Y":
      return ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
    case "5Y":
      return ["2020", "2021", "2022", "2023", "2024"];
    case "MAX":
      return ["2015", "2017", "2019", "2021", "2023"];
    default:
      return ["9:30", "11:00", "12:30", "14:00", "15:30", "16:00"];
  }
};

// Function to get industry average metrics for the metric popup using our industry-data module
const getIndustryAverageData = (stock: StockData, metricType: string) => {
  // Get industry averages from our centralized data
  const industryAvgs = getIndustryAverages(stock.industry);
  
  // Format for display
  if (metricType === 'performance') {
    return [
      { label: "Revenue Growth", value: `${industryAvgs.performance.revenueGrowth}` },
      { label: "Profit Margin", value: `${industryAvgs.performance.profitMargin}` },
      { label: "Return on Capital", value: `${industryAvgs.performance.returnOnCapital}` }
    ];
  } else if (metricType === 'stability') {
    return [
      { label: "Volatility", value: `${industryAvgs.stability.volatility}` },
      { label: "Beta", value: `${industryAvgs.stability.beta}` },
      { label: "Dividend Consistency", value: `${industryAvgs.stability.dividendConsistency}` }
    ];
  } else if (metricType === 'value') {
    return [
      { label: "P/E Ratio", value: `${industryAvgs.value.peRatio}` },
      { label: "P/B Ratio", value: `${industryAvgs.value.pbRatio}` },
      { label: "Dividend Yield", value: `${industryAvgs.value.dividendYield}` }
    ];
  } else if (metricType === 'momentum') {
    return [
      { label: "3-Month Return", value: `${industryAvgs.momentum.threeMonthReturn}` },
      { label: "Relative Performance", value: `${industryAvgs.momentum.relativePerformance}` },
      { label: "RSI", value: `${industryAvgs.momentum.rsi}` }
    ];
  }
  
  // Default empty array if metric type is not recognized
  return [];
};

export default function ImprovedSwipeStockCard({ 
  stock, 
  onNext, 
  onPrevious, 
  currentIndex, 
  totalCount,
  nextStock
}: SwipeStockCardProps) {
  const cardControls = useAnimation();
  const x = useMotionValue(0);
  // Enhanced transformations for smoother animations
  const cardOpacity = useTransform(x, [-300, -200, 0, 200, 300], [0.2, 0.8, 1, 0.8, 0.2]);
  const cardRotate = useTransform(x, [-300, 0, 300], [-8, 0, 8]);
  const nextStockOpacity = useTransform(x, [-300, -100, -20, 0, 20, 100, 300], [0.5, 0.3, 0, 0, 0, 0.3, 0.5]);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1M");
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  
  // State for metric popup
  const [isMetricPopupOpen, setIsMetricPopupOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    name: string;
    color: "green" | "yellow" | "red";
    data: any;
  } | null>(null);
  
  // Use timeframe-dependent chart data
  const chartData = useMemo(() => 
    generateTimeBasedData(stock.chartData, timeFrame),
    [stock.chartData, timeFrame]
  );
  
  // Calculate min/max for chart display
  const minValue = Math.min(...chartData) - 5;
  const maxValue = Math.max(...chartData) + 5;
  
  // Get time scale labels based on selected timeframe
  const timeScaleLabels = useMemo(() => 
    getTimeScaleLabels(timeFrame),
    [timeFrame]
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x > threshold) {
      setSwipeDirection("right");
      cardControls.start({
        x: 500,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onPrevious();
        cardControls.set({ x: 0, opacity: 1 });
        setSwipeDirection(null);
      });
    } else if (info.offset.x < -threshold) {
      setSwipeDirection("left");
      cardControls.start({
        x: -500,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onNext();
        cardControls.set({ x: 0, opacity: 1 });
        setSwipeDirection(null);
      });
    } else {
      cardControls.start({
        x: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      });
      setSwipeDirection(null);
    }
  };

  // Handler for metric button clicks
  const handleMetricClick = (metricName: string) => {
    // Get color and data for the selected metric
    let color: "green" | "yellow" | "red" = "green";
    let metricObj;
    let metricDetails;
    
    switch(metricName) {
      case "Performance":
        metricObj = stock.metrics.performance;
        metricDetails = stock.metrics.performance.details;
        break;
      case "Stability":
        metricObj = stock.metrics.stability;
        metricDetails = stock.metrics.stability.details;
        break;
      case "Value":
        metricObj = stock.metrics.value;
        metricDetails = stock.metrics.value.details;
        break;
      case "Momentum":
        metricObj = stock.metrics.momentum;
        metricDetails = stock.metrics.momentum.details;
        break;
      default:
        return;
    }
    
    // Map color string to type
    if (metricObj.color === "green") color = "green";
    else if (metricObj.color === "yellow") color = "yellow";
    else if (metricObj.color === "red") color = "red";
    
    // Format metric values for display
    const metricValues = [];
    if (metricName === "Performance") {
      const perfDetails = metricDetails as { revenueGrowth: number; profitMargin: number; returnOnCapital: number };
      metricValues.push(
        { label: "Revenue Growth", value: perfDetails.revenueGrowth, suffix: "%" },
        { label: "Profit Margin", value: perfDetails.profitMargin, suffix: "%" },
        { label: "Return on Capital", value: perfDetails.returnOnCapital, suffix: "%" }
      );
    } else if (metricName === "Stability") {
      const stabDetails = metricDetails as { volatility: number; beta: number; dividendConsistency: string };
      metricValues.push(
        { label: "Volatility", value: stabDetails.volatility, suffix: "" },
        { label: "Beta", value: stabDetails.beta, suffix: "" },
        { label: "Dividend Consistency", value: stabDetails.dividendConsistency, suffix: "" }
      );
    } else if (metricName === "Value") {
      const valDetails = metricDetails as { peRatio: number; pbRatio: number; dividendYield: number | "N/A" };
      metricValues.push(
        { label: "P/E Ratio", value: valDetails.peRatio, suffix: "" },
        { label: "P/B Ratio", value: valDetails.pbRatio, suffix: "" },
        { label: "Dividend Yield", value: valDetails.dividendYield === "N/A" ? "N/A" : valDetails.dividendYield, suffix: valDetails.dividendYield === "N/A" ? "" : "%" }
      );
    } else if (metricName === "Momentum") {
      const momDetails = metricDetails as { threeMonthReturn: number; relativePerformance: number; rsi: number };
      metricValues.push(
        { label: "3-Month Return", value: momDetails.threeMonthReturn, suffix: "%" },
        { label: "Relative Performance", value: momDetails.relativePerformance, suffix: "%" },
        { label: "RSI", value: momDetails.rsi, suffix: "" }
      );
    }
    
    // Get industry average data
    const industryAverage = getIndustryAverageData(stock, metricName.toLowerCase());
    
    // Set selected metric data and open popup
    setSelectedMetric({
      name: metricName,
      color,
      data: {
        values: metricValues,
        rating: metricObj.value,
        industryAverage,
        industry: stock.industry,
        explanation: metricObj.explanation || ""
      }
    });
    
    setIsMetricPopupOpen(true);
  };

  // Convert price to display format
  const displayPrice = stock.price.toFixed(2);
  
  // Determine price range to show on Y-axis
  const priceRangeMin = Math.floor(minValue);
  const priceRangeMax = Math.ceil(maxValue);
  
  return (
    <div className="relative h-full">
      {/* Next Stock Preview - visible during swipes */}
      {nextStock && (
        <motion.div 
          className="absolute inset-0 overflow-hidden pointer-events-none z-0"
          style={{
            opacity: nextStockOpacity,
            transform: `translateX(${x.get() < 0 ? '60px' : '-60px'})`,
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black p-4">
            {/* Simple preview of next stock */}
            <div className="rounded-xl overflow-hidden h-full flex flex-col opacity-60">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">{nextStock.name} <span className="text-gray-400">({nextStock.ticker})</span></h2>
                <div className={`inline-flex items-center mt-1 ${nextStock.change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  <span className="text-lg font-semibold">${nextStock.price.toFixed(2)}</span>
                  <span className="ml-2 text-sm">{nextStock.change >= 0 ? '+' : ''}{nextStock.change}%</span>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
                {/* Simple chart preview */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-full px-6">
                    <svg viewBox="0 0 300 80" width="100%" height="100%" preserveAspectRatio="none">
                      <path
                        d={`M 0,40 ${nextStock.chartData.map((point, i) => {
                          const x = (i / (nextStock.chartData.length - 1)) * 300;
                          const y = 80 - (point / Math.max(...nextStock.chartData) * 60);
                          return `L ${x},${y}`;
                        }).join(" ")}`}
                        fill="none"
                        stroke={nextStock.change >= 0 ? "#22c55e" : "#ef4444"}
                        strokeWidth="2"
                        strokeOpacity="0.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Swipe indicators */}
      <div className="absolute top-1/2 left-4 z-10 transform -translate-y-1/2 opacity-50">
        <ChevronLeft size={40} className={`text-white/30 ${currentIndex === 0 ? 'invisible' : ''}`} />
      </div>
      <div className="absolute top-1/2 right-4 z-10 transform -translate-y-1/2 opacity-50">
        <ChevronRight size={40} className="text-white/30" />
      </div>
      
      {/* Page indicator */}
      <div className="absolute top-2 left-0 right-0 flex justify-center z-10">
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs border border-gray-700">
          {currentIndex + 1} / {totalCount}
        </div>
      </div>

      <motion.div
        className="h-full overflow-y-auto overflow-x-hidden pb-16"
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        animate={cardControls}
        style={{ x, opacity: cardOpacity, rotateZ: cardRotate }}
      >
        {/* Time Frame Selector */}
        <div className="flex justify-between px-4 py-2 border-b border-gray-800">
          {["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"].map((period) => (
            <button
              key={period}
              className={`px-2 py-1.5 rounded-md transition-all duration-200 ${
                timeFrame === period 
                  ? "text-cyan-400 font-bold border-b-2 border-cyan-400 bg-cyan-500/10" 
                  : "text-gray-400 hover:bg-gray-800"
              }`}
              onClick={() => setTimeFrame(period as TimeFrame)}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-4 pt-8 pb-8 border-b border-gray-800 h-60 relative mt-2 bg-gradient-to-b from-gray-900 to-black">
          {/* Y-axis values - fixed positioning to avoid sticking out */}
          <div className="absolute left-1 top-0 bottom-16 flex flex-col justify-between text-xs text-gray-500 w-8 text-right">
            <div className="w-full px-1 py-0.5 rounded bg-black/70 backdrop-blur-sm text-right">${priceRangeMax}</div>
            <div className="w-full px-1 py-0.5 rounded bg-black/70 backdrop-blur-sm text-right">${Math.round((priceRangeMax + priceRangeMin) / 2 * 100) / 100}</div>
            <div className="w-full px-1 py-0.5 rounded bg-black/70 backdrop-blur-sm text-right">${priceRangeMin}</div>
          </div>
          
          {/* Chart grid lines */}
          <div className="absolute left-10 right-0 top-0 bottom-16 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-gray-800 w-full h-0"></div>
            <div className="border-t border-gray-800 w-full h-0"></div>
            <div className="border-t border-gray-800 w-full h-0"></div>
          </div>
          
          <div className="ml-10 chart-container h-[calc(100%-30px)]">
            <svg viewBox="0 0 300 80" width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`chartGradient-${stock.ticker}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={stock.change >= 0 ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"} />
                  <stop offset="100%" stopColor={stock.change >= 0 ? "rgba(34, 197, 94, 0)" : "rgba(239, 68, 68, 0)"} />
                </linearGradient>
                {/* Add a glow effect */}
                <filter id={`glow-${stock.ticker}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Line chart */}
              <path
                d={`M 0,${80 - ((chartData[0] - minValue) / (maxValue - minValue)) * 80} ${chartData.map((point, i) => {
                  const x = (i / (chartData.length - 1)) * 300;
                  const y = 80 - ((point - minValue) / (maxValue - minValue)) * 80;
                  return `L ${x},${y}`;
                }).join(" ")}`}
                fill="none"
                stroke={stock.change >= 0 ? "#22c55e" : "#ef4444"}
                strokeWidth="2.5"
                filter={`url(#glow-${stock.ticker})`}
              />
              
              {/* Area fill */}
              <path
                d={`M 0,${80 - ((chartData[0] - minValue) / (maxValue - minValue)) * 80} ${chartData.map((point, i) => {
                  const x = (i / (chartData.length - 1)) * 300;
                  const y = 80 - ((point - minValue) / (maxValue - minValue)) * 80;
                  return `L ${x},${y}`;
                }).join(" ")} L 300,80 L 0,80 Z`}
                fill={`url(#chartGradient-${stock.ticker})`}
              />
            </svg>
          </div>
          
          {/* Time scale */}
          <div className="ml-10 flex justify-between text-xs text-gray-400 mt-4 p-2 bg-black/40 backdrop-blur-sm rounded-md">
            {timeScaleLabels.map((label, index) => (
              <span key={index} className="font-medium">{label}</span>
            ))}
          </div>
        </div>

        {/* Stock Info */}
        <div className="px-4 py-4 border-b border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-black">
          {/* Header with name, ticker, and price side by side */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-sm">{stock.name} <span className="text-gray-400">({stock.ticker})</span></h2>
            </div>
            
            {/* Price bubble horizontal to the name */}
            <div className={`flex items-center ${stock.change >= 0 ? 'bg-gradient-to-r from-green-900/50 to-green-950/30' : 'bg-gradient-to-r from-red-900/50 to-red-950/30'} rounded-full px-3 py-1.5 border ${stock.change >= 0 ? 'border-green-500/30' : 'border-red-500/30'} shadow-lg`}
              style={{
                boxShadow: stock.change >= 0 ? '0 0 15px rgba(34, 197, 94, 0.1)' : '0 0 15px rgba(239, 68, 68, 0.1)'
              }}
            >
              <span className="text-xl font-bold text-white drop-shadow-md">${displayPrice}</span>
              <span className={`ml-2 text-sm ${stock.change >= 0 ? 'text-green-300' : 'text-red-300'} flex items-center font-medium drop-shadow-sm`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${stock.change >= 0 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                {stock.change >= 0 ? '+' : ''}{stock.change}%
              </span>
            </div>
          </div>
          
          {/* Description bubble */}
          <div className="p-3 bg-gray-800/70 rounded-lg border border-gray-700/50 shadow-inner">
            <p className="text-sm text-gray-300">
              {stock.description}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-900/80">
          {Object.entries(stock.metrics).map(([key, metricObj]) => {
            const metricName = key.charAt(0).toUpperCase() + key.slice(1);
            
            return (
              <div 
                key={key}
                className={`p-3 rounded-xl relative ${
                  metricObj.color === 'green' ? 'bg-gradient-to-br from-green-900/40 to-black border border-green-500/50' :
                  metricObj.color === 'yellow' ? 'bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-500/50' : 
                  'bg-gradient-to-br from-red-900/40 to-black border border-red-500/50'
                } active:scale-95 transition-all duration-150 cursor-pointer shadow-lg hover:shadow-xl backdrop-blur-sm`}
                onClick={() => handleMetricClick(metricName)}
                style={{
                  boxShadow: metricObj.color === 'green' ? '0 0 15px rgba(34, 197, 94, 0.15)' :
                          metricObj.color === 'yellow' ? '0 0 15px rgba(234, 179, 8, 0.15)' :
                          '0 0 15px rgba(239, 68, 68, 0.15)'
                }}
              >
                <div className="absolute top-2 right-2">
                  <Info size={16} className={`${
                    metricObj.color === 'green' ? 'text-green-400 drop-shadow-md' :
                    metricObj.color === 'yellow' ? 'text-yellow-400 drop-shadow-md' : 
                    'text-red-400 drop-shadow-md'
                  }`} />
                </div>
                <div 
                  className={`text-lg font-bold ${
                    metricObj.color === 'green' ? 'text-green-300' :
                    metricObj.color === 'yellow' ? 'text-yellow-300' : 
                    'text-red-300'
                  } drop-shadow-md`}
                >
                  {metricObj.value}
                </div>
                <div className="text-white text-sm font-medium capitalize mt-1 drop-shadow-sm">{metricName}</div>
              </div>
            );
          })}
        </div>

        {/* Stock Synopsis - Enhanced with unified appearance */}
        <div className="p-4 bg-gradient-to-br from-gray-900 via-gray-900 to-black border-b border-gray-800">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 shadow-lg mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-cyan-400 w-10 h-10 min-w-10 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-cyan-800/30 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <h3 className="font-bold text-lg text-white drop-shadow-sm">Stock Synopsis</h3>
            </div>
            <span className="text-xs text-cyan-300 bg-gray-800/50 px-2 py-1 rounded-full border border-gray-700/50 shadow-inner flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <path d="M12 17h.01"></path>
              </svg>
              AI Analysis
            </span>
          </div>
          
          {/* Unified card with sections divided by borders */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
            {/* Price Trend */}
            <div className="border-b border-gray-700/70">
              <div className="flex gap-3 p-4">
                <div className={`text-${stock.change >= 0 ? 'green' : 'red'}-400 w-12 h-12 min-w-12 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-${stock.change >= 0 ? 'green' : 'red'}-700/30`}
                  style={{
                    boxShadow: stock.change >= 0 ? '0 0 15px rgba(34, 197, 94, 0.1)' : '0 0 15px rgba(239, 68, 68, 0.1)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-base drop-shadow-sm flex items-center">
                    Price Trend
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${stock.change >= 0 ? 'text-green-300 bg-green-900/30 border border-green-700/30' : 'text-red-300 bg-red-900/30 border border-red-700/30'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1 leading-relaxed">{stock.synopsis.price}</div>
                </div>
              </div>
            </div>
            
            {/* Company News */}
            <div className="border-b border-gray-700/70">
              <div className="flex gap-3 p-4">
                <div className="text-blue-400 w-12 h-12 min-w-12 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-blue-700/30"
                  style={{
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01" />
                    <path d="M16 6h.01" />
                    <path d="M12 6h.01" />
                    <path d="M12 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M16 10h.01" />
                    <path d="M16 14h.01" />
                    <path d="M8 10h.01" />
                    <path d="M8 14h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-base drop-shadow-sm">Company News</div>
                  <div className="text-sm text-gray-300 mt-1 leading-relaxed">{stock.synopsis.company}</div>
                </div>
              </div>
            </div>
            
            {/* Portfolio Role */}
            <div>
              <div className="flex gap-3 p-4">
                <div className="text-purple-400 w-12 h-12 min-w-12 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-purple-700/30"
                  style={{
                    boxShadow: '0 0 15px rgba(168, 85, 247, 0.1)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
                    <path d="M16.5 16 15 20h-6l-1.5-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-base drop-shadow-sm">Portfolio Role</div>
                  <div className="text-sm text-gray-300 mt-1 leading-relaxed">{stock.synopsis.role}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Premium Insights Section */}
          {(stock.oneYearReturn || stock.predictedPrice) && (
            <div className="mt-4">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 shadow-lg mb-0 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-yellow-400 w-10 h-10 min-w-10 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-yellow-800/30 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      <path d="m19 2 2 2-2 2"></path>
                      <path d="m19 20 2 2-2 2"></path>
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg text-white drop-shadow-sm">Premium Insights</h3>
                </div>
                <span className="text-xs text-yellow-300 bg-gray-800/50 px-2 py-1 rounded-full border border-gray-700/50 shadow-inner flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                  </svg>
                  AI Predictions
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                {/* 1-Year Return */}
                {stock.oneYearReturn && (
                  <div className="border-b border-gray-700/70">
                    <div className="flex gap-3 p-4">
                      <div className={`${parseFloat(stock.oneYearReturn) >= 0 ? "text-green-400" : "text-red-400"} w-12 h-12 min-w-12 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border ${parseFloat(stock.oneYearReturn) >= 0 ? "border-green-700/30" : "border-red-700/30"}`}
                        style={{
                          boxShadow: parseFloat(stock.oneYearReturn) >= 0 ? '0 0 15px rgba(34, 197, 94, 0.1)' : '0 0 15px rgba(239, 68, 68, 0.1)'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                          <polyline points="16 7 22 7 22 13"></polyline>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-base drop-shadow-sm flex items-center">
                          1-Year Return
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${parseFloat(stock.oneYearReturn) >= 0 ? "text-green-300 bg-green-900/30 border border-green-700/30" : "text-red-300 bg-red-900/30 border border-red-700/30"}`}>
                            {stock.oneYearReturn}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mt-1 leading-relaxed">
                          Historical performance over the past 12 months shows {parseFloat(stock.oneYearReturn) >= 0 ? "positive" : "negative"} returns.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Predicted Price - Blurred as premium feature */}
                {stock.predictedPrice && (
                  <div>
                    <div className="flex gap-3 p-4">
                      <div className="text-blue-400 w-12 h-12 min-w-12 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg border border-blue-700/30"
                        style={{
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                          <path d="M12 18V6"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-base drop-shadow-sm flex items-center">
                          Expected Price Target
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full text-yellow-300 bg-yellow-900/30 border border-yellow-700/30">
                            PREMIUM
                          </span>
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="text-lg font-bold text-gray-300 blur-sm hover:blur-none transition-all duration-300 bg-blue-500/10 rounded px-3 py-1">
                            {stock.predictedPrice}
                          </div>
                          <div className="ml-2 text-yellow-400 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M12 8v4"></path>
                              <path d="M12 16h.01"></path>
                            </svg>
                            Unlock with premium
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Overall Analysis */}
        {stock.overallAnalysis && (
          <div className="p-4 bg-gray-900/80">
            <OverallAnalysisCard
              ticker={stock.ticker}
              name={stock.name}
              rating={stock.rating}
              analysis={stock.overallAnalysis}
            />
          </div>
        )}
      </motion.div>
      
      {/* Metric Popup */}
      {selectedMetric && (
        <MetricPopup
          isOpen={isMetricPopupOpen}
          onClose={() => setIsMetricPopupOpen(false)}
          metricName={selectedMetric.name}
          metricColor={selectedMetric.color}
          metricData={selectedMetric.data}
        />
      )}
    </div>
  );
}