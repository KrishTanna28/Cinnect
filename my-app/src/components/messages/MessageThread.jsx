"use client"

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Smile, Image as ImageIcon, Phone, Video, Info, X, Loader, Sticker, PlaySquare, ImagePlus, FileImage } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

export default function MessageThread({ conversation, onBack, onUpdate }) {
  const { user } = useUser();
  const socket = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const fileTypeRef = useRef('image');
  const [selectedMediaType, setSelectedMediaType] = useState('image');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Reacting to messages state
  const [reactingToMsgId, setReactingToMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const participant = conversation.participant;

  useEffect(() => {
    if (conversation) {
      fetchMessages();
    }
  }, [conversation]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !conversation) return;

    const handleNewMessage = async (data) => {
      if (data.conversationId === conversation._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
        
        // If we are viewing this chat and receive a message, immediately mark it as read
        if (data.message.sender._id !== user._id) {
          try {
            const token = localStorage.getItem('token');
            await fetch(`/api/messages/${conversation._id}/read`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (onUpdate) onUpdate(); // Update list to remove any unread counts immediately
          } catch (err) {
            console.error('Failed to mark incoming message as read', err);
          }
        }
      }
    };

    const handleMessagesRead = (data) => {
      if (data.conversationId === conversation._id) {
        // Update read status
        setMessages(prev => prev.map(msg => ({
          ...msg,
          readBy: msg.sender._id === user._id ? [...(msg.readBy || []).filter(r => r.user !== data.userId), { user: data.userId }] : msg.readBy
        })));
      }
    };

    const handleMessageReact = (data) => {
      if (data.conversationId === conversation._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    };

    const unsubscribe1 = socket.on('message:new', handleNewMessage);
    const unsubscribe2 = socket.on('messages:read', handleMessagesRead);
    const unsubscribe3 = socket.on('message:react', handleMessageReact);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, [socket, conversation, user]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${conversation._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
        // Notify parent to refresh conversation list so unread counts disappear immediately
        if (conversation.unreadCount > 0 && onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e, contentToSend = newMessage, type = 'text', fileData = null) => {
    if (e) e.preventDefault();
    if (!contentToSend.trim() && !fileData) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentToSend.trim(), type, fileData })
      });

      const data = await res.json();
      if (!data.success) {
        toast({
          title: "Sending failed",
          description: data.message || "Something went wrong.",
          variant: "destructive"
        });
      } else {
        setMessages(prev => {
          if (prev.some(m => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        if (type === 'text') setNewMessage('');
        scrollToBottom();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Send the base64 string
      handleSendMessage(null, '', fileTypeRef.current, reader.result);
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset
  };

  const triggerFileInput = (type) => {
    setSelectedMediaType(type);
    fileTypeRef.current = type;
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else if (type === 'gif') fileInputRef.current.accept = 'image/gif';
      else if (type === 'sticker') fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
  };

  const handleEmojiClick = (emojiObj) => {
    setNewMessage(prev => prev + emojiObj.emoji);
  };

  const reactToMessage = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${conversation._id}/${messageId}/react`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: "Could not add reaction", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
    }
    setReactingToMsgId(null);
  };

  const handleAcceptRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/conversations/${conversation._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'accept' })
      });

      if (res.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/conversations/${conversation._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'decline' })
      });

      if (res.ok) {
        if (onBack) onBack();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt);
      let label;
      if (isToday(date)) {
        label = 'Today';
      } else if (isYesterday(date)) {
        label = 'Yesterday';
      } else {
        label = format(date, 'MMMM d, yyyy');
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-background w-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Avatar className="w-10 h-10">
            <AvatarImage src={participant?.avatar} />
            <AvatarFallback>
              {participant?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{participant?.username}</p>
            {participant?.fullName && (
              <p className="text-xs text-muted-foreground">{participant.fullName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost">
            <Phone className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost">
            <Video className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Request Banner */}
      {conversation.isRequest && (
        <div className="bg-card border-b border-border p-4 flex-shrink-0">
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-semibold text-foreground">{participant?.username}</span> wants to send you a message
          </p>
          <div className="flex gap-2">
            <Button onClick={handleAcceptRequest} className="flex-1">
              Accept
            </Button>
            <Button onClick={handleDeclineRequest} variant="outline" className="flex-1">
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Messages - Independent Scrollbar */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={participant?.avatar} />
              <AvatarFallback className="text-2xl">
                {participant?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold mb-1">{participant?.username}</p>
            {participant?.fullName && (
              <p className="text-sm text-muted-foreground mb-4">{participant.fullName}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                <div className="space-y-2">
                  {msgs.map((msg, idx) => {
                    const isOwn = msg.sender._id === user._id;
                    const showAvatar = !isOwn && (idx === msgs.length - 1 || msgs[idx + 1]?.sender._id !== msg.sender._id);
                    const isRead = msg.readBy?.some(r => r.user !== user._id);
                    const hasReactions = msg.reactions?.length > 0;

                    let pressTimer = null;
                    const handlePointerDown = () => {
                      pressTimer = setTimeout(() => {
                        setReactingToMsgId(msg._id);
                      }, 500); // 500ms for long press
                    };
                    const handlePointerUp = () => {
                      if (pressTimer) clearTimeout(pressTimer);
                    };

                    const handleContextMenu = (e) => {
                      e.preventDefault();
                      setReactingToMsgId(msg._id);
                    };

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isOwn && (
                          <Avatar className={`w-6 h-6 ${showAvatar ? 'visible' : 'invisible'}`}>
                            <AvatarImage src={participant?.avatar} />
                            <AvatarFallback className="text-xs">
                              {participant?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
                          
                          {/* Message Bubble + Context Menu Handler */}
                          <Popover 
                            open={reactingToMsgId === msg._id} 
                            onOpenChange={(open) => !open && setReactingToMsgId(null)}
                          >
                            <PopoverTrigger asChild>
                              <div
                                onPointerDown={handlePointerDown}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                onContextMenu={handleContextMenu}
                                className={`relative cursor-pointer ${
                                  msg.type !== 'text' && !msg.content
                                    ? '' // Only media, no padding/background
                                    : `px-4 py-2 rounded-2xl ${
                                        isOwn
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-secondary text-secondary-foreground'
                                      }`
                                }`}
                              >
                                {/* Media Rendering */}
                                {msg.type === 'image' && (
                                  <img src={msg.mediaUrl} alt="Image" className={`max-w-full mb-1 object-cover max-h-64 ${msg.content ? 'rounded-md' : 'rounded-2xl'}`} />
                                )}
                                {msg.type === 'gif' && (
                                    <img src={msg.mediaUrl} alt="GIF" className={`max-w-full mb-1 object-cover max-h-64 ${msg.content ? 'rounded-md' : 'rounded-2xl'}`} />
                                )}
                                {msg.type === 'video' && (
                                  <video src={msg.mediaUrl} controls className={`max-w-full mb-1 object-cover max-h-64 ${msg.content ? 'rounded-md' : 'rounded-2xl'}`} />
                                )}
                                {msg.type === 'sticker' && (
                                  <img src={msg.mediaUrl} alt="Sticker" className="w-32 h-32 object-contain bg-transparent mb-1 drop-shadow-sm" />
                                )}

                                {/* Text content */}
                                {msg.content && <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>}

                                {/* Reactions Display */}
                                {hasReactions && (
                                  <div className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex items-center bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm text-xs`}>
                                    {msg.reactions.map((r, i) => (
                                      <span key={i}>{r.emoji}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="center" className="w-auto p-0 border-none shadow-none bg-transparent">
                              <div className="bg-card border border-border p-0 rounded-lg shadow-lg overflow-hidden">
                                <EmojiPicker
                                  onEmojiClick={(emojiObj) => reactToMessage(msg._id, emojiObj.emoji)}
                                  theme="dark"
                                  skinTonesDisabled
                                  width={300}
                                  height={400}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>

                          {isOwn && (
                            <span className="text-xs text-muted-foreground mt-3">
                              {isRead ? 'Seen' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0 relative">
        {sending && selectedMediaType !== 'text' && (
          <div className="absolute -top-10 left-4 text-xs text-muted-foreground flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
            <Loader className="w-3 h-3 animate-spin" /> Uploading media...
          </div>
        )}
        <form onSubmit={(e) => handleSendMessage(e, newMessage, 'text')} className="flex items-center gap-2">
          
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button type="button" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer">
                <Smile className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-0 mb-2 border-none">
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" skinTonesDisabled />
            </PopoverContent>
          </Popover>

          <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
            <PopoverTrigger asChild>
              <button type="button" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer">
                <ImageIcon className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-48 p-2 mb-2 flex flex-col gap-1">
                <Button variant="ghost" className="justify-start gap-3 w-full p-0" asChild>
                  <label className="flex items-center w-full px-4 py-2 cursor-pointer h-full">
                    <ImagePlus className="w-4 h-4 mr-3" /> Image
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { fileTypeRef.current = 'image'; setSelectedMediaType('image'); handleFileSelect(e); }} />
                  </label>
                </Button>
                <Button variant="ghost" className="justify-start gap-3 w-full p-0" asChild>
                  <label className="flex items-center w-full px-4 py-2 cursor-pointer h-full">
                    <PlaySquare className="w-4 h-4 mr-3" /> Video
                    <input type="file" className="hidden" accept="video/*" onChange={(e) => { fileTypeRef.current = 'video'; setSelectedMediaType('video'); handleFileSelect(e); }} />
                  </label>
                </Button>
                <Button variant="ghost" className="justify-start gap-3 w-full p-0" asChild>
                  <label className="flex items-center w-full px-4 py-2 cursor-pointer h-full">
                    <FileImage className="w-4 h-4 mr-3" /> GIF
                    <input type="file" className="hidden" accept="image/gif" onChange={(e) => { fileTypeRef.current = 'gif'; setSelectedMediaType('gif'); handleFileSelect(e); }} />
                  </label>
                </Button>
                <Button variant="ghost" className="justify-start gap-3 w-full p-0" asChild>
                  <label className="flex items-center w-full px-4 py-2 cursor-pointer h-full">
                    <Sticker className="w-4 h-4 mr-3" /> Sticker
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { fileTypeRef.current = 'sticker'; setSelectedMediaType('sticker'); handleFileSelect(e); }} />
                  </label>
                </Button>
              </PopoverContent>
            </Popover>
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={sending && newMessage === ''}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
