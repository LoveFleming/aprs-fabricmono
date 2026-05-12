/**
 * HelloWorld Demo Page
 * A simple demo for testing the HelloWorld AI Node
 */

import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Play, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

type Language = "en" | "zh" | "ja" | "es";

interface HelloWorldRequest {
  traceId: string;
  name?: string;
  language?: Language;
}

interface HelloWorldResponse {
  traceId: string;
  greeting: string;
  message: string;
  language: string;
  timestamp: string;
  nodeInfo: {
    nodeId: string;
    version: string;
    factory: string;
  };
}

const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "Hello" },
  { code: "zh", label: "Chinese", native: "你好" },
  { code: "ja", label: "Japanese", native: "こんにちは" },
  { code: "es", label: "Spanish", native: "¡Hola" },
];

export default function HelloWorldDemo() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState&lt;Language&gt;("en");
  const [response, setResponse] = useState&lt;HelloWorldResponse | null&gt;(null);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState&lt;"idle" | "success" | "error"&gt;("idle");

  const generateTraceId = () => {
    return `hello-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setStatus("idle");

    const request: HelloWorldRequest = {
      traceId: generateTraceId(),
      name: name || undefined,
      language,
    };

    try {
      const res = await fetch("/api/hello-world", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.errorCode || data.message || "Unknown error");
        setStatus("error");
      } else {
        setResponse(data);
        setStatus("success");
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hello-world");
      const data = await res.json();
      alert(`Health Check: ${data.status}\nNode: ${data.nodeId}\nVersion: ${data.version}`);
    } catch (err) {
      alert(`Health Check Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    &lt;div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6"&gt;
      &lt;div className="max-w-4xl mx-auto"&gt;
        {/* Header */}
        &lt;div className="mb-8"&gt;
          &lt;h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2"&gt;
            🏭 Hello World Demo
          &lt;/h1&gt;
          &lt;p className="text-gray-600 dark:text-gray-400"&gt;
            Testing the simplest AI Node in the factory. Demonstrates 
            &lt;strong&gt;Spec → Code → Test → Deploy&lt;/strong&gt; workflow.
          &lt;/p&gt;
        &lt;/div&gt;

        &lt;div className="grid grid-cols-1 lg:grid-cols-2 gap-6"&gt;
          {/* Input Panel */}
          &lt;Card className="p-6"&gt;
            &lt;h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"&gt;
              &lt;span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs"&gt;
                1
              &lt;/span&gt;
              Input Contract
            &lt;/h2&gt;

            &lt;div className="space-y-4"&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"&gt;
                  Your Name
                &lt;/label&gt;
                &lt;input
                  type="text"
                  value={name}
                  onChange={(e) =&gt;
                    setName(e.target.value)}
                  placeholder="Enter your name (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                /&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"&gt;
                  Language
                &lt;/label&gt;
                &lt;div className="grid grid-cols-2 gap-2"&gt;
                  {languages.map((lang) =&gt; (
                    &lt;button
                      key={lang.code}
                      onClick={() =&gt;
                        setLanguage(lang.code)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        language === lang.code
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    &gt;
                      &lt;div className="font-medium text-gray-900 dark:text-white"&gt;
                        {lang.native}
                      &lt;/div&gt;
                      &lt;div className="text-xs text-gray-500 dark:text-gray-400"&gt;
                        {lang.label}
                      &lt;/div&gt;
                    &lt;/button&gt;
                  ))}
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div className="flex gap-3 pt-2"&gt;
                &lt;Button
                  onClick={handleTest}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                &gt;
                  {loading ? (
                    &lt;&gt;
                      &lt;RefreshCw className="w-4 h-4 mr-2 animate-spin" /&gt;
                      Processing...
                    &lt;/&gt;
                  ) : (
                    &lt;&gt;
                      &lt;Play className="w-4 h-4 mr-2" /&gt;
                      Test Node
                    &lt;/&gt;
                  )}
                &lt;/Button&gt;
                &lt;Button
                  onClick={handleHealthCheck}
                  variant="secondary"
                  disabled={loading}
                &gt;
                  Health
                &lt;/Button&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/Card&gt;

          {/* Output Panel */}
          &lt;Card className="p-6"&gt;
            &lt;h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"&gt;
              &lt;span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs"&gt;
                2
              &lt;/span&gt;
              Output Contract
            &lt;/h2&gt;

            &lt;div className="space-y-4"&gt;
              {!response && !error && (
                &lt;div className="text-center py-12 text-gray-400"&gt;
                  &lt;div className="text-4xl mb-2"&gt;🏭&lt;/div&gt;
                  &lt;p&gt;Click "Test Node" to see the response&lt;/p&gt;
                &lt;/div&gt;
              )}

              {status === "error" && error && (
                &lt;div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"&gt;
                  &lt;div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2"&gt;
                    &lt;AlertCircle className="w-5 h-5" /&gt;
                    &lt;span className="font-medium"&gt;Error&lt;/span&gt;
                  &lt;/div&gt;
                  &lt;code className="text-sm text-red-600 dark:text-red-300"&gt;
                    {error}
                  &lt;/code&gt;
                &lt;/div&gt;
              )}

              {status === "success" && response && (
                &lt;&gt;
                  {/* Message Display */}
                  &lt;div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg text-center"&gt;
                    &lt;div className="text-2xl mb-2"&gt;
                      {response.language === "es" ? "🎉" : "👋"}
                    &lt;/div&gt;
                    &lt;p className="text-lg font-medium text-gray-900 dark:text-white"&gt;
                      {response.message}
                    &lt;/p&gt;
                  &lt;/div&gt;

                  {/* Response Details */}
                  &lt;div className="space-y-3"&gt;
                    &lt;div className="flex items-center gap-2 text-sm"&gt;
                      &lt;CheckCircle className="w-4 h-4 text-green-500" /&gt;
                      &lt;span className="text-gray-600 dark:text-gray-400"&gt;
                        Node: &lt;/span&gt;
                      &lt;code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"&gt;
                        {response.nodeInfo.nodeId}
                      &lt;/code&gt;
                    &lt;/div&gt;
                    &lt;div className="flex items-center gap-2 text-sm"&gt;
                      &lt;CheckCircle className="w-4 h-4 text-green-500" /&gt;
                      &lt;span className="text-gray-600 dark:text-gray-400"&gt;
                        Version: &lt;/span&gt;
                      &lt;code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"&gt;
                        {response.nodeInfo.version}
                      &lt;/code&gt;
                    &lt;/div&gt;
                    &lt;div className="flex items-center gap-2 text-sm"&gt;
                      &lt;CheckCircle className="w-4 h-4 text-green-500" /&gt;
                      &lt;span className="text-gray-600 dark:text-gray-400"&gt;
                        Trace ID: &lt;/span&gt;
                      &lt;code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded truncate max-w-[150px]"&gt;
                        {response.traceId}
                      &lt;/code&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;

                  {/* Full Response JSON */}
                  &lt;details className="mt-4"&gt;
                    &lt;summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"&gt;
                      View Full Response JSON
                    &lt;/summary&gt;
                    &lt;pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-48"&gt;
                      {JSON.stringify(response, null, 2)}
                    &lt;/pre&gt;
                  &lt;/details&gt;
                &lt;/&gt;
              )}
            &lt;/div&gt;
          &lt;/Card&gt;
        &lt;/div&gt;

        {/* Documentation */}
        &lt;Card className="mt-6 p-6"&gt;
          &lt;h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4"&gt;
            📋 Node Specifications
          &lt;/h2&gt;

          &lt;div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm"&gt;
            &lt;div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"&gt;
              &lt;h3 className="font-medium text-gray-900 dark:text-white mb-2"&gt;
                Input Contract
              &lt;/h3&gt;
              &lt;ul className="space-y-1 text-gray-600 dark:text-gray-400"&gt;
                &lt;li&gt;• &lt;code&gt;traceId&lt;/code&gt; (required)&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;name&lt;/code&gt; (optional)&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;language&lt;/code&gt; (en/zh/ja/es)&lt;/li&gt;
              &lt;/ul&gt;
            &lt;/div&gt;

            &lt;div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"&gt;
              &lt;h3 className="font-medium text-gray-900 dark:text-white mb-2"&gt;
                Output Contract
              &lt;/h3&gt;
              &lt;ul className="space-y-1 text-gray-600 dark:text-gray-400"&gt;
                &lt;li&gt;• &lt;code&gt;traceId&lt;/code&gt;&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;greeting&lt;/code&gt;&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;message&lt;/code&gt;&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;timestamp&lt;/code&gt;&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;nodeInfo&lt;/code&gt;&lt;/li&gt;
              &lt;/ul&gt;
            &lt;/div&gt;

            &lt;div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"&gt;
              &lt;h3 className="font-medium text-gray-900 dark:text-white mb-2"&gt;
                Error Codes
              &lt;/h3&gt;
              &lt;ul className="space-y-1 text-gray-600 dark:text-gray-400"&gt;
                &lt;li&gt;• &lt;code&gt;BIZ_HELLO_WORLD_REQUEST_INVALID&lt;/code&gt;&lt;/li&gt;
                &lt;li&gt;• &lt;code&gt;SYS_HELLO_WORLD_PROCESSING_FAILED&lt;/code&gt;&lt;/li&gt;
              &lt;/ul&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/Card&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}