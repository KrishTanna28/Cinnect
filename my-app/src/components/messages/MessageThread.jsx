"use client"

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Smile, Image as ImageIcon, Phone, Video, Info, X, Sticker, PlaySquare, ImagePlus, FileImage, Trash2, Ban, VolumeX, Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const isOnlyEmojis = (str) => {
  if (!str || typeof str !== 'string') return false;
  const stripped = str.replace(/\s/g, '');
  if (!stripped) return false;
  // Match emojis, zero width joiners, variation selectors, and emoji components
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u;
  return emojiRegex.test(stripped);
};

function CustomVideoPlayer({ url, className = "", videoClassName = "" }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleRestart = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleMuteToggle = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleMouseMove = () => {
    setShowControlsOverlay(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false);
      }, 3000);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`relative group w-fit ${className}`}
      onClick={handleVideoClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControlsOverlay(false)}
    >
      <video
        ref={videoRef}
        src={url}
        className={`w-full h-full ${videoClassName}`}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="p-3 bg-black/60 rounded-full">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      )}

      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-2 transition-opacity duration-300 ${
          showControlsOverlay || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="w-full h-1 bg-white/30 rounded-full mb-2 cursor-pointer group/progress"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePlayPause}
              className="p-1 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={handleMuteToggle}
              className="p-1 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-white text-[10px] ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              className="p-1 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageThread({ conversation, onBack, onUpdate }) {
  const { user } = useUser();
  const socket = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesContainerRef = useRef(null);
  const autoScrollOnLayout = useRef(false);
  const scrollHeightBeforeLoad = useRef(null); // Store scroll height before loading older messages
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const fileTypeRef = useRef('image');
  const [selectedMediaType, setSelectedMediaType] = useState('image');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Info panel states
  const [showInfo, setShowInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reacting to messages state
  const [reactingToMsgId, setReactingToMsgId] = useState(null);

  // Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const otherUserTypingTimeoutRef = useRef(null);

  // Set global active conversation so navigation top bar knows when not to alert
  useEffect(() => {
    if (conversation?._id) {
      window.activeConversationId = conversation._id;
    }
    return () => {
      window.activeConversationId = null;
    };
  }, [conversation?._id]);

  const messagesEndRef = useRef(null);
  const participant = conversation.participant;

  useEffect(() => {
      // Use just the conversation ID as dependency to prevent infinite loops when onUpdate replaces the whole object
      if (conversation?._id) {
        setPage(1);
        setMessages([]);
        setHasMore(true);
        setLoading(true);
        fetchMessages(1, true);
      }
    }, [conversation?._id]);

  // Handle scroll position after messages update
  useLayoutEffect(() => {
    if (!messagesContainerRef.current) return;

    // Auto-scroll to bottom for initial load or new messages sent
    if (autoScrollOnLayout.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      autoScrollOnLayout.current = false;
    }
    // Restore scroll position after loading older messages
    else if (scrollHeightBeforeLoad.current !== null) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - scrollHeightBeforeLoad.current;
      messagesContainerRef.current.scrollTop = scrollDiff;
      scrollHeightBeforeLoad.current = null;
    }
  }, [messages]);

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
            await fetch(`/api/messages/${conversation._id}/read`, {
              method: 'PATCH',
              headers: {}
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

    const handleTypingStart = (data) => {
      const currentConvId = String(conversation._id || '');
      const incomingConvId = String(data.conversationId || '');
      
      if (currentConvId === incomingConvId) {
        setIsTyping(true);
        if (otherUserTypingTimeoutRef.current) clearTimeout(otherUserTypingTimeoutRef.current);
        otherUserTypingTimeoutRef.current = setTimeout(() => setIsTyping(false), 5000);
        scrollToBottom();
      }
    };

    const handleTypingStop = (data) => {
      const currentConvId = String(conversation._id || '');
      const incomingConvId = String(data.conversationId || '');

      if (currentConvId === incomingConvId) {
        setIsTyping(false);
        if (otherUserTypingTimeoutRef.current) clearTimeout(otherUserTypingTimeoutRef.current);
      }
    };

    const unsubscribe4 = socket.on('typing:start', handleTypingStart);
    const unsubscribe5 = socket.on('typing:stop', handleTypingStop);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
      unsubscribe5();
    };
  }, [socket, conversation, user]);

  useEffect(() => {
    if (conversation && user) {
      setIsMuted(conversation.mutedBy?.some(id => {
        const idStr = typeof id === 'object' ? (id._id?.toString() || id.toString()) : id.toString();
        const userStr = typeof user._id === 'object' ? user._id.toString() : user._id.toString();
        return idStr === userStr;
      }) || false);
    }
  }, [conversation, user]);

  const handleToggleMute = async () => {
    if (isMuting) return;
    
    const previousState = isMuted;
    setIsMuted(!previousState); // Optimistic UI update
    setIsMuting(true);
    
    try {
      const res = await fetch(`/api/messages/${conversation._id}/mute`, {
        method: 'POST',
        headers: {}
      });
      const data = await res.json();
      
      if (data.success) {
        setIsMuted(data.isMuted);
        
        // Mutate local prop copy to prevent UI un-syncs before re-fetch happens
        if (conversation) {
          if (data.isMuted) {
            if (!conversation.mutedBy) conversation.mutedBy = [];
            conversation.mutedBy.push(user._id);
          } else {
            if (conversation.mutedBy) {
              conversation.mutedBy = conversation.mutedBy.filter(id => {
                const idStr = typeof id === 'object' ? (id._id?.toString() || id.toString()) : id.toString();
                return idStr !== user._id.toString();
              });
            }
          }
        }
        
        if (onUpdate) onUpdate();
      } else {
        setIsMuted(previousState);
      }
    } catch (e) {
      console.error(e);
      setIsMuted(previousState);
    } finally {
      setIsMuting(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      setIsBlocking(true);
      const res = await fetch(`/api/users/${participant._id}/block`, {
        method: 'POST',
        headers: {}
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: participant?.didIBlockThem ? 'User unblocked' : 'User blocked' });
        onBack && onBack();
        onUpdate && onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDeleteChat = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/messages/${conversation._id}`, {
        method: 'DELETE',
        headers: {}
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Chat deleted' });
        onBack && onBack();
        onUpdate && onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const fetchMessages = async (pageNum = 1, isInitial = false) => {
    try {
      if (!isInitial) setIsLoadingMore(true);
      const res = await fetch(`/api/messages/${conversation._id}?page=${pageNum}&limit=50`, {
        headers: {}
      });
      const data = await res.json();

      if (data.success) {
        if (pageNum === 1) {
          setPage(1);
          autoScrollOnLayout.current = true;
          setMessages(data.messages);
          if (conversation.unreadCount > 0 && onUpdate) {
            onUpdate();
          }
        } else {
          // Store scroll height before adding messages - useLayoutEffect will restore position
          if (messagesContainerRef.current) {
            scrollHeightBeforeLoad.current = messagesContainerRef.current.scrollHeight;
          }
          setMessages(prev => {
            const newMsgs = data.messages.filter(nm => !prev.some(pm => pm._id === nm._id));
            return [...newMsgs, ...prev];
          });
        }
        setHasMore(data.pagination.page < data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (isInitial) setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    // Adding a buffer of 10px from the top just in case
    if (e.target.scrollTop < 10 && !isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, false);
    }
  };

  const handleSendMessage = async (e, contentToSend = newMessage, type = 'text', fileData = null) => {
    if (e) e.preventDefault();
    if (!contentToSend.trim() && !fileData) return;

    if (socket && participant?._id) {
      socket.emit('typing:stop', { recipientId: participant._id, conversationId: conversation._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    setSelectedMediaType(type);

    // Create optimistic message for immediate display
    const tempId = 'temp-' + Date.now();
    const optimisticMessage = {
      _id: tempId,
      conversation: conversation._id,
      sender: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar
      },
      content: contentToSend.trim(),
      type,
      mediaUrl: fileData ? fileData : null, // Show base64 preview for media
      createdAt: new Date().toISOString(),
      readBy: [{ user: user._id, readAt: new Date().toISOString() }],
      _isSending: true // Flag to show sending state
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    if (type === 'text') setNewMessage('');
    scrollToBottom();

    // Send to server in background
    try {
      const res = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: contentToSend.trim(), type, fileData })
      });

      const data = await res.json();
      if (!data.success) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m._id !== tempId));
        toast({
          title: "Sending failed",
          description: data.message || "Something went wrong.",
          variant: "destructive"
        });
      } else {
        // Replace optimistic message with real one from server
        setMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempId);
          if (filtered.some(m => m._id === data.message._id)) return filtered;
          return [...filtered, data.message];
        });
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== tempId));
      console.error('Error sending message:', error);
      toast({ title: "Failed to send message", variant: "destructive" });
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
      const res = await fetch(`/api/messages/${conversation._id}/${messageId}/react`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
      const res = await fetch(`/api/messages/conversations/${conversation._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
      const res = await fetch(`/api/messages/conversations/${conversation._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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

  const scrollToBottom = (behavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
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
    <div className="flex flex-1 h-full w-full relative overflow-hidden bg-background">
      <div className={`flex flex-col h-full transition-all duration-300 ${showInfo ? 'w-full hidden md:flex md:w-[calc(100%-300px)]' : 'w-full'}`}>
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
          <button 
            className={`p-2 transition-all active:scale-90 cursor-pointer ${showInfo ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            onClick={() => setShowInfo(!showInfo)}
          >
            <Info className="w-5 h-5" />
          </button>
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
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
      >
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
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
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
                                className={`relative cursor-pointer ${msg._isSending ? 'opacity-70' : ''} ${
                                  (msg.type !== 'text' && !msg.content) || (msg.type === 'text' && isOnlyEmojis(msg.content))
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
                                  <img src={msg.mediaUrl} alt="Image" className={`max-w-full mb-1 object-cover max-h-64 ${msg.content && !isOnlyEmojis(msg.content) ? 'rounded-md' : 'rounded-2xl'}`} />
                                )}
                                {msg.type === 'gif' && (
                                    <img src={msg.mediaUrl} alt="GIF" className={`max-w-full mb-1 object-cover max-h-64 ${msg.content && !isOnlyEmojis(msg.content) ? 'rounded-md' : 'rounded-2xl'}`} />
                                )}
                                {msg.type === 'video' && (
                                  <CustomVideoPlayer 
                                    url={msg.mediaUrl} 
                                    className={`max-w-full mb-1 flex items-center justify-center bg-black overflow-hidden ${msg.content && !isOnlyEmojis(msg.content) ? 'rounded-md' : 'rounded-2xl'}`} 
                                    videoClassName="max-h-64 object-contain"
                                  />
                                )}
                                {msg.type === 'sticker' && (
                                  <img src={msg.mediaUrl} alt="Sticker" className="w-32 h-32 object-contain bg-transparent mb-1 drop-shadow-sm" />
                                )}

                                {/* Text content */}
                                {msg.content && (
                                  <p className={`break-words whitespace-pre-wrap ${
                                    isOnlyEmojis(msg.content) 
                                      ? 'text-5xl bg-transparent p-0 leading-none drop-shadow-sm' 
                                      : 'text-sm'
                                  }`}>
                                    {msg.content}
                                  </p>
                                )}

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
                              {msg._isSending ? 'Sending...' : isRead ? 'Seen' : 'Sent'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Avatar className="w-8 h-8 rounded-full border border-border flex-shrink-0">
                  <AvatarImage src={participant?.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {participant?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0 relative">
        {sending && selectedMediaType !== 'text' && (
          <div className="absolute -top-10 left-4 text-xs text-muted-foreground flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {participant?.isBlockedByThem || participant?.didIBlockThem ? (
          <div className="w-full text-center py-2.5 text-sm text-muted-foreground bg-secondary/30 rounded-lg border border-border">
            You cannot reply to this conversation.
          </div>
        ) : (
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
            onChange={(e) => {
              const val = e.target.value;
              setNewMessage(val);
              
              if (socket && socket.emit && participant?._id) {
                const recId = String(participant._id);
                const convId = String(conversation._id);
                
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                
                if (val.trim() === '') {
                  socket.emit('typing:stop', { recipientId: recId, conversationId: convId });
                } else {
                  socket.emit('typing:start', { recipientId: recId, conversationId: convId });
                  typingTimeoutRef.current = setTimeout(() => {
                    socket.emit('typing:stop', { recipientId: recId, conversationId: convId });
                  }, 3000);
                }
              }
            }}
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
        )}
    </div>
    </div>

      {/* Info Sidebar */}
      {showInfo && (
        <div className="absolute top-0 right-0 h-full w-full md:w-[300px] border-l border-border bg-background z-20 flex flex-col md:relative shadow-xl md:shadow-none transition-all duration-300 animate-in slide-in-from-right-8">
          <div className="border-b border-border p-5.5 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Details</h3>
            <button onClick={() => setShowInfo(false)} className="p-2 text-muted-foreground hover:text-foreground cursor-pointer md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 flex flex-col items-center border-b border-border">
            {participant?.isBlockedByThem ? (
              <>
                <Avatar className="w-20 h-20 mb-3 cursor-default">
                  <AvatarImage src={participant?.avatar} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">U</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-lg cursor-default">
                  {participant?.username}
                </span>
                {participant?.fullName && participant.fullName !== 'User' && <p className="text-muted-foreground text-sm">@{participant?.username}</p>}
              </>
            ) : (
              <>
                <Link href={`/profile/${participant?._id}`}>
                  <Avatar className="w-20 h-20 mb-3 hover:opacity-80 transition-opacity cursor-pointer">
                    <AvatarImage src={participant?.avatar} />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">{participant?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <Link href={`/profile/${participant?._id}`} className="font-semibold text-lg hover:text-primary">
                  {participant?.fullName || participant?.username}
                </Link>
                {participant?.fullName && <p className="text-muted-foreground text-sm">@{participant?.username}</p>}
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2"><VolumeX className="w-4 h-4" /> Mute messages</span>
                <button 
                  onClick={handleToggleMute}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isMuted ? 'bg-primary' : 'bg-secondary'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-background transition-transform duration-200 ${isMuted ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} style={{boxShadow: "0 2px 4px rgba(0,0,0,0.2)"}} />
                </button>
              </div>
            </div>
              {!showDeleteConfirm ? (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-sm hover:bg-secondary cursor-pointer transition-colors text-red-500 hover:text-red-400"
                >
                  <span className="font-medium">Delete Chat</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/30 mb-2">
                  <p className="text-xs text-red-500 mb-3 font-medium">Delete entire conversation? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="flex-1 h-8 text-xs" onClick={handleDeleteChat} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-white/20 hover:bg-white/10" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>)}

              {!showBlockConfirm ? (
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-sm hover:bg-secondary cursor-pointer transition-colors text-red-500 hover:text-red-400"
                >
                  <span className="font-medium">{participant?.didIBlockThem ? 'Unblock' : 'Block'}</span>
                  <Ban className="w-4 h-4" />
                </button>
              ) : (
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/30 mb-2">
                  <p className="text-xs text-red-500 mb-3 font-medium">
                    {participant?.didIBlockThem ? `Unblock ${participant?.username}?` : `Block ${participant?.username}? They won't be able to interact with you.`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="flex-1 h-8 text-xs" onClick={handleBlockUser} disabled={isBlocking}>
                      {isBlocking ? 'Processing...' : (participant?.didIBlockThem ? 'Unblock' : 'Block')}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-white/20 hover:bg-white/10" onClick={() => setShowBlockConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}
    </div>
  );
}