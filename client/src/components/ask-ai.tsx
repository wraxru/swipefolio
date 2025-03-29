import { useState } from "react";
import axios from "axios";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { StockData } from "@/lib/stock-data";

interface AskAIProps {
  stock: StockData;
}

export default function AskAI({ stock }: AskAIProps) {
  const [userQuestion, setUserQuestion] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [errorAI, setErrorAI] = useState<string | null>(null);
  // Initialize with the accordion open by default
  const [accordionValue, setAccordionValue] = useState<string>("ask-ai");

  const handleSendQuestion = async () => {
    if (!userQuestion.trim()) return;
    
    setIsLoadingAI(true);
    setAiResponse("");
    setErrorAI(null);
    
    console.log("Sending AI request:", {
      userQuestion,
      stockContext: stock
    });
    
    try {
      // Construct stock context object with relevant data
      const stockContext = {
        name: stock.name,
        ticker: stock.ticker,
        description: stock.description || "",
        price: stock.price,
        industry: stock.industry,
        metrics: {
          performance: stock.metrics?.performance?.value || null,
          stability: stock.metrics?.stability?.value || null,
          value: stock.metrics?.value?.value || null,
          momentum: stock.metrics?.momentum?.value || null
        }
      };
      
      console.log("API request payload:", { userQuestion, stockContext });
      
      // Make API request to our backend
      const response = await axios.post("/api/ai/ask-stock", {
        userQuestion,
        stockContext
      });
      
      console.log("API response received:", response.data);
      
      // Update state with AI's response
      if (response.data && response.data.answer) {
        setAiResponse(response.data.answer);
      } else {
        console.error("Missing answer in response:", response.data);
        setErrorAI("No answer received from AI service. Please check your API key and try again.");
      }
    } catch (error: any) {
      console.error("Error getting AI response:", error);
      
      // Extract and display more detailed error information
      let errorMessage = "Unknown error occurred";
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = `Server error: ${error.response.data.message}`;
        } else if (error.response.status === 401) {
          errorMessage = "Authentication error. Please check your API key.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error. The AI service might be unavailable.";
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response from server. Network issue or server is down.";
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      setErrorAI(errorMessage);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Use stock ticker and truncated name for the title
  const displayName = stock.name.length > 20 ? stock.name.substring(0, 20) + "..." : stock.name;
  const accordionTitle = `Ask AI about ${stock.ticker} (${displayName})`;

  // Add debugging to see API responses
  const handleSendDebug = async () => {
    console.log("Sending AI question:", userQuestion);
    await handleSendQuestion();
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-b border-blue-100 mb-4 shadow-md">
      <div className="p-1 border-l-4 border-blue-500">
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="w-full"
        >
          <AccordionItem value="ask-ai" className="border-none">
            <AccordionTrigger className="px-4 py-3 hover:no-underline font-medium text-sm flex items-center">
              <span className="flex items-center gap-2 text-blue-800">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-semibold shadow-sm">
                  AI
                </span>
                {accordionTitle}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-2 pb-4">
              <div className="space-y-3 bg-white rounded-md p-3">
                {/* Question Input */}
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder={`Ask a question about ${stock.ticker}...`}
                    className="resize-none min-h-[80px] text-sm border-blue-200 text-slate-900"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    disabled={isLoadingAI}
                  />
                  <Button
                    onClick={handleSendDebug}
                    disabled={isLoadingAI || !userQuestion.trim()}
                    className="self-end bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    size="sm"
                  >
                    {isLoadingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
                
                {/* AI Response Display */}
                {aiResponse && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-700 mb-1">AI Response:</h3>
                    <div className="text-sm text-slate-700 whitespace-pre-line">
                      {aiResponse}
                    </div>
                  </div>
                )}
                
                {/* Error Display */}
                {errorAI && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-100">
                    <h3 className="text-sm font-medium text-red-700 mb-1">Error:</h3>
                    <div className="text-sm text-slate-700">{errorAI}</div>
                  </div>
                )}
                
                {/* Disclaimer */}
                <div className="mt-2 text-xs text-slate-500 italic">
                  AI responses are for educational purposes only and are not financial advice.
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}