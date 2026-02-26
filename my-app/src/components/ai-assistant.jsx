"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Sparkles, Bot, User, Loader2, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/UserContext"

// Check if suggestions are from today
const isSameDay = (dateString) => {
  if (!dateString) return false
  const savedDate = new Date(dateString)
  const today = new Date()
  return (
    savedDate.getDate() === today.getDate() &&
    savedDate.getMonth() === today.getMonth() &&
    savedDate.getFullYear() === today.getFullYear()
  )
}

export default function AIAssistant() {
  const { user, isLoading: isUserLoading } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey there! 👋 I'm C.A.S.T — your Cinematic Assistant for Smart Tastes. Ask me anything about movies, shows, actors, or what's trending! 🎬",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch daily suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // Check localStorage for cached suggestions
        const cached = localStorage.getItem("cast_suggestions")
        if (cached) {
          const { suggestions, generatedAt } = JSON.parse(cached)
          if (isSameDay(generatedAt) && suggestions?.length === 4) {
            setSuggestedQuestions(suggestions)
            return
          }
        }

        // Fetch new suggestions from API
        const response = await fetch("/api/ai-assistant/suggestions")
        if (response.ok) {
          const data = await response.json()
          if (data.suggestions?.length === 4) {
            setSuggestedQuestions(data.suggestions)
            // Cache the suggestions
            localStorage.setItem("cast_suggestions", JSON.stringify({
              suggestions: data.suggestions,
              generatedAt: data.generatedAt,
            }))
          }
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        // Keep default suggestions on error
      }
    }

    if (user) {
      fetchSuggestions()
    }
  }, [user])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.slice(-10), // Send last 10 messages for context
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again! 😅",
          },
        ])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Oops! Something went wrong. Please try again later. 🎬",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
    {!isUserLoading && user && (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        data-ai-toggle
        className={cn(
          "fixed bottom-6 right-6 z-50 hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300 hover:scale-110 active:scale-95 group",
          isOpen && "!hidden"
        )}
        aria-label="AI Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-in-out",
          // Mobile: full screen | Desktop: bottom-right popup
          "inset-0 sm:inset-auto sm:bottom-6 sm:right-6",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
          isMinimized ? "sm:w-72" : "sm:w-[420px]"
        )}
      >
        <div className={cn(
          "bg-card border-border shadow-2xl overflow-hidden flex flex-col",
          // Mobile: full screen, no rounded corners | Desktop: rounded popup
          "h-full w-full sm:border sm:rounded-2xl",
          isMinimized ? "sm:h-14" : "sm:h-[600px] sm:max-h-[80vh]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:py-3 pt-safe  border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">C.A.S.T</h3>
                <p className="text-[10px] text-muted-foreground">Cinematic Assistant for Smart Tastes</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Hide minimize button on mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg transition-all active:scale-90 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    {message.role === "user" ? (
                      <Avatar className="flex-shrink-0 w-8 h-8">
                        <AvatarImage src={user?.profilePicture || user?.avatar} alt={user?.username || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {user?.username?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-secondary text-foreground rounded-tl-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-secondary px-4 py-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions (only show when conversation is minimal) */}
              {messages.length <= 2 && !isLoading && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInput(question)
                          inputRef.current?.focus()
                        }}
                        className="text-xs px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 pb-safe sm:pb-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="rounded-xl h-10 w-10 flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>)}
    </>
  )
}
