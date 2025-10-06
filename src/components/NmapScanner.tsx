import { useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Terminal, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Backend API URL - make sure your FastAPI backend is running on this port
const API_URL = "http://localhost:8000";

type ScanType = "quick" | "tcp" | "udp" | "version" | "ping";

interface ScanResult {
  target: string;
  scan_type: string;
  args: string;
  result: any;
}

export default function NmapScanner() {
  const [target, setTarget] = useState("scanme.nmap.org");
  const [scanType, setScanType] = useState<ScanType>("quick");
  const [ports, setPorts] = useState("22,80");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setExplanation(null);

    try {
      // POST request to FastAPI backend
      const response = await axios.post(`${API_URL}/scan`, {
        target,
        scan_type: scanType,
        ports: ports || undefined,
      });

      setResult(response.data);
      
      // Get AI explanation
      setLoadingExplanation(true);
      try {
        const { data: explanationData, error: explanationError } = await supabase.functions.invoke('explain-scan', {
          body: { scanResult: response.data }
        });

        if (explanationError) {
          console.error("Failed to get explanation:", explanationError);
        } else if (explanationData?.explanation) {
          setExplanation(explanationData.explanation);
        }
      } catch (explainErr) {
        console.error("Error getting explanation:", explainErr);
      } finally {
        setLoadingExplanation(false);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Scan failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-primary glow-text" />
            <h1 className="text-4xl font-bold text-foreground">Nmap Scanner</h1>
          </div>
          <p className="text-muted-foreground">Network exploration and security auditing tool</p>
        </div>

        {/* Scanner Card */}
        <Card className="p-6 bg-card border-border space-y-6">
          {/* Form */}
          <div className="grid gap-6">
            {/* Target Input */}
            <div className="space-y-2">
              <Label htmlFor="target" className="text-foreground">
                Target (IP or Domain)
              </Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., scanme.nmap.org or 192.168.1.1"
                className="bg-input border-border text-foreground"
              />
            </div>

            {/* Scan Type Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="scan-type" className="text-foreground">
                Scan Type
              </Label>
              <Select value={scanType} onValueChange={(value) => setScanType(value as ScanType)}>
                <SelectTrigger id="scan-type" className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="quick">Quick Scan (-T4 -Pn)</SelectItem>
                  <SelectItem value="tcp">TCP Connect (-sT -T4 -Pn)</SelectItem>
                  <SelectItem value="udp">UDP Scan (-sU -T4 -Pn)</SelectItem>
                  <SelectItem value="version">Version Detection (-sV -sC -O -Pn)</SelectItem>
                  <SelectItem value="ping">Ping Only (-sn)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ports Input */}
            <div className="space-y-2">
              <Label htmlFor="ports" className="text-foreground">
                Ports (optional)
              </Label>
              <Input
                id="ports"
                value={ports}
                onChange={(e) => setPorts(e.target.value)}
                placeholder="e.g., 22,80,443 or 1-1024"
                className="bg-input border-border text-foreground"
              />
            </div>

            {/* Run Scan Button */}
            <Button
              onClick={handleScan}
              disabled={loading || !target}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Terminal className="mr-2 h-4 w-4" />
                  Run Scan
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          {(result || error) && (
            <div className="space-y-2">
              <Label className="text-foreground">Results</Label>
              {error ? (
                <div className="bg-code-bg border border-border rounded-lg p-4">
                  <pre className="text-sm text-destructive font-mono whitespace-pre-wrap">
                    Error: {error}
                  </pre>
                </div>
              ) : (
                <Tabs defaultValue="explanation" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="explanation" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Explanation
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Raw Data
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="explanation" className="mt-4">
                    <div className="bg-card border border-border rounded-lg p-4 max-h-96 overflow-auto">
                      {loadingExplanation ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="ml-2 text-muted-foreground">Generating explanation...</span>
                        </div>
                      ) : explanation ? (
                        <div className="prose prose-sm max-w-none text-foreground">
                          <pre className="whitespace-pre-wrap font-sans">{explanation}</pre>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No explanation available</p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="raw" className="mt-4">
                    <div className="bg-code-bg border border-border rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm text-foreground font-mono whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </Card>

        {/* Connection Instructions */}
        <Card className="p-4 bg-card border-border">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">📡 Backend Connection:</p>
            <p>
              • Make sure your FastAPI backend is running at{" "}
              <code className="text-primary font-mono">http://localhost:8000</code>
            </p>
            <p>
              • Run: <code className="text-primary font-mono">python nmap_api.py</code> or{" "}
              <code className="text-primary font-mono">uvicorn nmap_api:app --reload</code>
            </p>
            <p>
              • Ensure CORS is enabled for{" "}
              <code className="text-primary font-mono">http://localhost:5173</code>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
