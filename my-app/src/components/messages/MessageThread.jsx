"use client"

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Smile, Image as ImageIcon, Phone, Video, Info, X, Loader } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export default function MessageThread({ conversation, onBack, onUpdate }) {
  const { user } = useUser();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
        setMessages(prev => [...prev, data.message]);
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

    const unsubscribe1 = socket.on('message:new', handleNewMessage);
    const unsubscribe2 = socket.on('messages:read', handleMessagesRead);

    return () => {
      unsubscribe1();
      unsubscribe2();
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        scrollToBottom();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
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
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.content}</p>
                          </div>
                          {isOwn && (
                            <span className="text-xs text-muted-foreground mt-1">
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
      <div className="border-t border-border p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost">
            <Smile className="w-5 h-5" />
          </Button>
          <Button type="button" size="icon" variant="ghost">
            <ImageIcon className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={sending}
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
