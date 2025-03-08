import React, { useState, useEffect, useRef, TouchEvent } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Check, Send, Reply, X } from "lucide-react";
import { playMessageSentSound, playMessageReceivedSound, playAIMessageSound, playRoomEntrySound, initAudio } from "@/lib/sounds";

type ReplyTo = {
  id: string;
  content: string;
  userName: string;
  isAI: boolean;
};

type Message = {
  id: string;
  content: string;
  userName: string;
  isAI: boolean;
  createdAt: string;
  status?: 'sending' | 'sent';
  isNew?: boolean;
  replyTo?: ReplyTo | null;
  replyToId?: string | null;
};

export default function Home() {
  // App state
  const [userName, setUserName] = useLocalStorage<string>("userName", "");
  const [roomCode, setRoomCode] = useState<string>("");
  const [currentRoomId, setCurrentRoomId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Refs for auto-scrolling and scroll position tracking
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch messages when room changes
  useEffect(() => {
    if (currentRoomId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRoomId]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);
  
  // Track scroll position to determine if auto-scroll should be enabled
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      // If user is near bottom (within 100px), enable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    };
    
    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/get?roomId=${currentRoomId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setActiveTab("roomCode");
    }
  };

  const handleRoomCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check if room exists
      const checkResponse = await fetch("/api/room/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode }),
      });

      const checkData = await checkResponse.json();

      if (checkData.exists) {
        // Room exists, join it
        setCurrentRoomId(checkData.roomId);
        setActiveTab("chatRoom");
      } else {
        // Room doesn't exist, create it
        const createResponse = await fetch("/api/room/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: roomCode }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          setCurrentRoomId(createData.id);
          setActiveTab("chatRoom");
        } else {
          const errorData = await createResponse.json();
          setError(errorData.error || "Failed to create room");
        }
      }
    } catch (error) {
      console.error("Error joining/creating room:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Play sound when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only play sounds for new messages that aren't from the current user
      if (lastMessage.isNew && lastMessage.status !== 'sending') {
        if (lastMessage.isAI) {
          playAIMessageSound();
        } else if (lastMessage.userName !== userName) {
          playMessageReceivedSound();
        }
      }
    }
  }, [messages, userName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // Create a temporary message with sending status
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content: newMessage,
      userName,
      isAI: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
      isNew: true,
      replyToId: replyingTo?.id,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        userName: replyingTo.userName,
        isAI: replyingTo.isAI
      } : null
    };
    
    // Add the temporary message to both local and server message states
    setMessages(prev => [...prev, tempMessage]);
    setLocalMessages(prev => [...prev, tempMessage]);
    
    // Play sound effect for sending message
    playMessageSentSound();
    
    // Clear the input and reset reply state
    const messageToSend = newMessage;
    setNewMessage("");
    setReplyingTo(null);
    
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageToSend,
          userName,
          roomId: currentRoomId,
          replyToId: replyingTo?.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the temporary message with the real one, but keep it in the UI
        const updatedMessage = { ...data.userMessage, status: 'sent', isNew: true };
        
        // Update both message states
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? updatedMessage : msg
        ));
        setLocalMessages(prev => prev.map(msg => 
          msg.id === tempId ? updatedMessage : msg
        ));
        
        // If there's an AI response, add it after a short delay
        if (data.aiMessage) {
          const aiMessage = { ...data.aiMessage, isNew: true };
          setTimeout(() => {
            setMessages(prev => [...prev, aiMessage]);
            setLocalMessages(prev => [...prev, aiMessage]);
          }, 800);
        }
        
        // Remove the isNew flag after animation completes
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.isNew ? { ...msg, isNew: false } : msg
          ));
          setLocalMessages(prev => prev.map(msg => 
            msg.isNew ? { ...msg, isNew: false } : msg
          ));
        }, 1500);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Keep the message in the UI but mark it as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, content: msg.content + " (Failed to send)" } : msg
      ));
      setLocalMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, content: msg.content + " (Failed to send)" } : msg
      ));
    }
  };
  
  // Handle message swipe for reply
  const handleTouchStart = (e: TouchEvent, message: Message) => {
    const touch = e.touches[0];
    const messageElement = e.currentTarget as HTMLElement;
    messageElement.dataset.startX = touch.clientX.toString();
    messageElement.classList.add('swiping');
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    const messageElement = e.currentTarget as HTMLElement;
    const startX = parseInt(messageElement.dataset.startX || '0');
    const currentX = touch.clientX;
    const diff = currentX - startX;
    
    // Only allow swiping right (for reply)
    if (diff > 0) {
      // Limit the swipe distance
      const swipeDistance = Math.min(diff, 80);
      messageElement.style.transform = `translateX(${swipeDistance}px)`;
      
      // Show reply indicator when swiped enough
      if (swipeDistance > 40) {
        messageElement.classList.add('swiped');
        const messageId = messageElement.dataset.messageId;
        if (messageId) {
          setSwipedMessageId(messageId);
        }
      } else {
        messageElement.classList.remove('swiped');
        setSwipedMessageId(null);
      }
    }
  };
  
  const handleTouchEnd = (e: TouchEvent, message: Message) => {
    const messageElement = e.currentTarget as HTMLElement;
    messageElement.classList.remove('swiping');
    
    // Reset transform
    messageElement.style.transform = '';
    
    // If message was swiped enough, set it as reply target
    if (messageElement.classList.contains('swiped')) {
      setReplyingTo(message);
      messageElement.classList.remove('swiped');
    }
    
    setSwipedMessageId(null);
  };
  
  // Function to cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
  };
  
  // Function to handle room entry
  useEffect(() => {
    if (activeTab === "chatRoom" && currentRoomId) {
      // Play room entry sound when entering a chat room
      playRoomEntrySound();
    }
  }, [activeTab, currentRoomId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Head>
        <title>Textify</title>
        <meta name="description" content="Real-time chat application with AI assistance" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-background min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="hidden">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="roomCode">Room Code</TabsTrigger>
              <TabsTrigger value="chatRoom">Chat Room</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to Textify</CardTitle>
                  <CardDescription>Enter your name to get started</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent>
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Your name" 
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full">Continue</Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="roomCode">
              <Card>
                <CardHeader>
                  <CardTitle>Join a Room</CardTitle>
                  <CardDescription>Enter a room code to join or create a new room</CardDescription>
                </CardHeader>
                <form onSubmit={handleRoomCodeSubmit}>
                  <CardContent>
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="roomCode">Room Code</Label>
                        <Input 
                          id="roomCode" 
                          placeholder="Enter room code" 
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          required
                        />
                      </div>
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Connecting..." : "Continue"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="chatRoom">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Chat Room: {roomCode}</CardTitle>
                  <CardDescription>Chatting as {userName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea ref={scrollAreaRef} className="chat-container h-[calc(100vh-280px)] sm:h-[400px] w-full pr-4">
                    <div className="flex flex-col gap-3">
                      {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
                      ) : (
                        messages.map((message) => (
                          <div 
                            key={message.id} 
                            data-message-id={message.id}
                            onTouchStart={(e) => handleTouchStart(e, message)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={(e) => handleTouchEnd(e, message)}
                            className={`message-container relative flex flex-col p-3 rounded-lg shadow-sm ${
                              message.isAI 
                                ? "bg-secondary border border-primary/10" 
                                : message.userName === userName 
                                  ? "bg-primary text-primary-foreground ml-auto" 
                                  : "bg-muted"
                            } max-w-[80%] ${message.userName === userName && !message.isAI ? "ml-auto" : "mr-auto"}
                            ${message.isNew ? `message-new ${message.isAI ? "ai-message" : "user-message"}` : ""}
                            ${message.status === "sending" ? "message-sending" : ""}
                            ${message.status === "sent" ? "message-sent" : ""}`}
                          >
                            {/* Reply indicator */}
                            <div className="message-reply-indicator">
                              <Reply size={16} className="text-primary" />
                            </div>
                            
                            {/* Replied message (if any) */}
                            {message.replyTo && (
                              <div className="replied-message">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-xs">
                                    {message.replyTo.isAI ? "AI Assistant" : message.replyTo.userName}
                                  </span>
                                </div>
                                <p className="text-xs truncate">
                                  {message.replyTo.content.length > 100 
                                    ? message.replyTo.content.substring(0, 100) + "..." 
                                    : message.replyTo.content}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">
                                {message.isAI ? "AI Assistant" : message.userName}
                              </span>
                              <div className="flex items-center gap-1">
                                {message.status === "sending" && (
                                  <div className="flex items-center">
                                    <span className="sending-indicator"></span>
                                    <span className="text-xs">Sending...</span>
                                  </div>
                                )}
                                {message.status === "sent" && (
                                  <Check size={12} className="tick-animation" />
                                )}
                                <span className="text-xs opacity-70">
                                  {formatDate(message.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.isAI && message.isNew && (
                              <div className="typing-indicator mt-1">
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {/* This div is used as a reference for auto-scrolling */}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter>
                  <form onSubmit={handleSendMessage} className="w-full flex flex-col gap-2">
                    {/* Reply preview */}
                    {replyingTo && (
                      <div className="reply-preview w-full">
                        <div className="flex justify-between">
                          <span className="font-semibold text-xs">
                            Replying to {replyingTo.isAI ? "AI Assistant" : replyingTo.userName}
                          </span>
                          <button 
                            type="button" 
                            onClick={cancelReply} 
                            className="reply-preview-close"
                            aria-label="Cancel reply"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs truncate">
                          {replyingTo.content.length > 100 
                            ? replyingTo.content.substring(0, 100) + "..." 
                            : replyingTo.content}
                        </p>
                      </div>
                    )}
                    
                    <div className="w-full flex gap-2">
                      <div className="w-full">
                        <Input 
                          placeholder="Type a message... (start with @AI to talk to the AI)" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className={newMessage.trim() ? "input-active" : ""}
                        />
                        {messages.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tip: Start with @AI for AI response | Swipe message right to reply
                          </p>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        className="button-send transition-transform"
                        disabled={!newMessage.trim()}
                      >
                        <Send size={18} className="mr-1" />
                        Send
                      </Button>
                    </div>
                  </form>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}