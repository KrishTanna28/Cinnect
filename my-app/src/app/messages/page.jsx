"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Edit, ArrowLeft, VolumeX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MessageThread from '@/components/messages/MessageThread';
import NewMessageDialog from '@/components/messages/NewMessageDialog';

export default function MessagesPage() {
  const { user, isLoading } = useUser();
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

  // Swipe logic
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeTab === 'messages' && user?.isPrivate) {
      setActiveTab('requests');
    } else if (isRightSwipe && activeTab === 'requests') {
      setActiveTab('messages');
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [user, isLoading, router]);

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
      // Fetch regular messages
      const messagesRes = await fetch('/api/messages/conversations?type=messages', {
        headers: {}
      });
      const messagesData = await messagesRes.json();
      
      // Fetch requests
      const requestsRes = await fetch('/api/messages/conversations?type=requests', {
        headers: {}
      });
      const requestsData = await requestsRes.json();

      if (messagesData.success) {
        setConversations(messagesData.data?.conversations || []);
      }
      if (requestsData.success) {
        setRequests(requestsData.data?.conversations || []);
      }

      // Check pending conversation from profile page
      const pendingConvId = localStorage.getItem('cinnect_pending_chat_conv');
      let targetConv = null;
      if (pendingConvId) {
        localStorage.removeItem('cinnect_pending_chat_conv');
        targetConv = messagesData.data?.conversations?.find(c => c._id === pendingConvId) || requestsData.data?.conversations?.find(c => c._id === pendingConvId);

        if (!targetConv) {
          try {
            const singleRes = await fetch(`/api/messages/conversations/${pendingConvId}`, {
              headers: {}
            });
            const singleData = await singleRes.json();
            if (singleData.success) {
              targetConv = singleData.conversation;
              setConversations(prev => {
                if (!prev.find(c => c._id === pendingConvId)) {
                  return [targetConv, ...prev];
                }
                return prev;
              });
            }
          } catch (err) {
            console.error('Failed to fetch pending conversation', err);
          }
        }

        if (targetConv) {
          setSelectedConversation(targetConv);
        }
      }

      if (!targetConv) {
        // Update selected conversation if it exists
        setSelectedConversation(prev => {
          if (!prev) return prev;
          const msgConv = messagesData.data?.conversations?.find(c => c._id === prev._id);
          const reqConv = requestsData.data?.conversations?.find(c => c._id === prev._id);
          return msgConv || reqConv || prev;
        });
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

  const filteredConversations = (activeTab === 'messages' ? conversations : requests)?.filter(
    conv => {
      if (!searchQuery) return true;
      const participant = conv.participant;
      return (
        participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        participant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  ) || [];

  const totalUnread = (conversations || []).filter(conv => (conv.unreadCount || 0) > 0).length;
  const totalRequests = (requests || []).length;

  // Mobile view: show either list or thread
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="fixed inset-x-0 top-16 bottom-14 bg-background z-20 flex flex-col overflow-hidden">
          <MessageThread
            key={selectedConversation._id}
            conversation={selectedConversation}
            onBack={handleBackToList}
            onUpdate={fetchConversations}
          />
        </div>
      );
    }

    return (
      <div 
        className="fixed inset-x-0 top-16 bottom-14 bg-background z-10 flex flex-col overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
          {user?.isPrivate && (
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
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-secondary/50 rounded" />
                    <div className="h-3 w-48 bg-secondary/50 rounded" />
                  </div>
                  <div className="h-5 w-12 bg-secondary/50 rounded" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center mb-4">
                <Edit className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your messages</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Send messages to a friend.
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
                currentUser={user}
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
    <div className="h-[calc(100dvh-4rem)] bg-background flex overflow-hidden">
      {/* Left Sidebar */}
      <div 
        className="w-96 border-r border-border flex flex-col flex-shrink-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
                : 'text-muted-foreground hover:bg-primary/10'
            }`}
          >
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalUnread}
              </span>
            )}
          </button>
          {user?.isPrivate && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-primary/10'
              }`}
            >
              Requests
              {totalRequests > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                {totalRequests}
              </span>
            )}
          </button>)}
        </div>

        {/* Conversation List - Independent Scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-secondary/50 rounded" />
                    <div className="h-3 w-48 bg-secondary/50 rounded" />
                  </div>
                  <div className="h-5 w-12 bg-secondary/50 rounded" />
                </div>
              ))}
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
                currentUser={user}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Content - Independent Scrollbar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <MessageThread
            key={selectedConversation._id}
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
              Send messages to a friend.
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

function ConversationItem({ conversation, onClick, isActive = false, currentUser }) {
  const participant = conversation.participant;
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  const renderLastMessage = () => {
    if (!lastMessage) return 'Start a conversation';

    if (unreadCount > 1) {
      return `${unreadCount} messages`;
    }

    // Determine sender of the message
    let isSender = false;
    let senderId = null;
    if (lastMessage.sender) {
      senderId = typeof lastMessage.sender === 'object' ? lastMessage.sender._id : lastMessage.sender;
      isSender = senderId?.toString() === currentUser?._id?.toString();
    }

    // Determine if we should show a reaction instead
    if (lastMessage.reactions && lastMessage.reactions.length > 0) {
      const lastReaction = lastMessage.reactions[lastMessage.reactions.length - 1];
      const reactorId = typeof lastReaction.user === 'object' ? lastReaction.user._id : lastReaction.user;
      
      const isReactorMe = reactorId?.toString() === currentUser?._id?.toString();
      const reactorName = isReactorMe ? 'You' : (participant?.fullName?.split(' ')[0] || participant?.username);
      
      const whoseMessage = isSender ? (isReactorMe ? 'a' : 'your') : (isReactorMe ? 'their' : 'a');
      
      return `${reactorName}: ${lastReaction.emoji} reacted to ${whoseMessage} message`;
    }

    const prefix = isSender ? 'You: ' : `${participant?.fullName?.split(' ')[0] || participant?.username}: `;
    
    let contentStr = '';
    if (lastMessage.type === 'image') contentStr = 'Photo';
    else if (lastMessage.type === 'video') contentStr = 'Video';
    else if (lastMessage.type === 'gif') contentStr = 'GIF';
    else if (lastMessage.type === 'sticker') contentStr = 'Sticker';
    else contentStr = lastMessage.content || '';

    return `${prefix}${contentStr}`;
  };

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
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm truncate ${unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
              {participant?.username}
            </p>
            {conversation?.mutedBy?.some(id => id.toString() === currentUser?._id?.toString()) && (
              <VolumeX className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" title="Muted" />
            )}
          </div>
          {lastMessage && (
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {renderLastMessage()}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}