"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Edit, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MessageThread from '@/components/messages/MessageThread';
import NewMessageDialog from '@/components/messages/NewMessageDialog';

export default function MessagesPage() {
  const { user } = useUser();
  const router = useRouter();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' or 'requests'
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      fetchConversations();
    };

    const handleConversationUpdate = (data) => {
      fetchConversations();
    };

    const unsubscribe1 = socket.on('message:new', handleNewMessage);
    const unsubscribe2 = socket.on('conversation:update', handleConversationUpdate);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch regular messages
      const messagesRes = await fetch('/api/messages/conversations?type=messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const messagesData = await messagesRes.json();
      
      // Fetch requests
      const requestsRes = await fetch('/api/messages/conversations?type=requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const requestsData = await requestsRes.json();

      if (messagesData.success) {
        setConversations(messagesData.conversations);
      }
      if (requestsData.success) {
        setRequests(requestsData.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const filteredConversations = (activeTab === 'messages' ? conversations : requests).filter(
    conv => {
      if (!searchQuery) return true;
      const participant = conv.participant;
      return (
        participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        participant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  const totalRequests = requests.length;

  // Mobile view: show either list or thread
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
          <MessageThread
            conversation={selectedConversation}
            onBack={handleBackToList}
            onUpdate={fetchConversations}
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-background flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{user?.username}</h1>
            <button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewMessage(true)}
              className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            Requests
            {totalRequests > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalRequests}
              </span>
            )}
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center mb-4">
                <Edit className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your messages</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Send private photos and messages to a friend or group.
              </p>
              <Button onClick={() => setShowNewMessage(true)}>
                Send message
              </Button>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                onClick={() => handleConversationClick(conv)}
              />
            ))
          )}
        </div>

        <NewMessageDialog
          open={showNewMessage}
          onClose={() => setShowNewMessage(false)}
          onConversationCreated={(conv) => {
            setShowNewMessage(false);
            setSelectedConversation(conv);
            fetchConversations();
          }}
        />
      </div>
    );
  }

  // Desktop view: split layout
  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-96 border-r border-border flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{user?.username}</h1>
            <button
              size="icon"
              variant="ghost"
              className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer"
              onClick={() => setShowNewMessage(true)}
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            Requests
            {totalRequests > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalRequests}
              </span>
            )}
          </button>
        </div>

        {/* Conversation List - Independent Scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {activeTab === 'messages' ? 'No messages yet' : 'No requests'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                onClick={() => handleConversationClick(conv)}
                isActive={selectedConversation?._id === conv._id}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Content - Independent Scrollbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            onBack={handleBackToList}
            onUpdate={fetchConversations}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center mx-auto mb-4">
              <Edit className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Your messages</h3>
            <p className="text-muted-foreground mb-4">
              Send messages to a friend or a group.
            </p>
            <Button onClick={() => setShowNewMessage(true)}>
              Send message
            </Button>
          </div>
        )}
      </div>

      <NewMessageDialog
        open={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onConversationCreated={(conv) => {
          setShowNewMessage(false);
          setSelectedConversation(conv);
          fetchConversations();
        }}
      />
    </div>
  );
}

function ConversationItem({ conversation, onClick, isActive = false }) {
  const participant = conversation.participant;
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-3 hover:bg-primary/10 transition-colors ${
        isActive ? 'bg-accent/50' : ''
      }`}
    >
      <Avatar className="w-14 h-14">
        <AvatarImage src={participant?.avatar} />
        <AvatarFallback>
          {participant?.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
            {participant?.username}
          </p>
          {lastMessage && (
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {lastMessage?.content || 'Start a conversation'}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}
