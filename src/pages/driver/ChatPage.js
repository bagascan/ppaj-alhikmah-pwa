import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { BsSend } from 'react-icons/bs';
import { socket } from '../../socket';
import api from '../../api';
import { toast } from 'react-toastify';

function DriverChatPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Ambil parentId dari URL
  const { parentId } = useParams();

  // Fungsi untuk scroll ke pesan terakhir
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fungsi untuk menentukan ruang obrolan dan memuat data awal
    const initializeChat = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setError("Sesi tidak valid. Silakan login kembali.");
        return;
      }
      const user = JSON.parse(atob(token.split('.')[1])).user;
      if (user.role !== 'driver' || !user.profileId) throw new Error("Akses ditolak.");

      const driverUser = { id: user.profileId, role: 'driver' };
      setCurrentUser(driverUser);

      try {
        // 3. Buat ID ruang obrolan yang konsisten
        if (!parentId) throw new Error("Wali murid tidak dipilih.");
        const chatRoomId = [driverUser.id, parentId].sort().join('-');
        setRoom(chatRoomId);

        // 4. Bergabung ke ruang obrolan di server
        socket.emit('joinRoom', chatRoomId);

        // 5. Ambil riwayat chat
        const historyRes = await api.get(`/chat/${chatRoomId}`);
        setMessages(historyRes.data);

        // 6. Tandai pesan sebagai sudah dibaca
        await api.put(`/chat/read/${chatRoomId}`, { readerId: driverUser.id });
        // Beri tahu komponen lain (seperti BottomNav) bahwa pesan telah dibaca
        window.dispatchEvent(new Event('messagesRead'));
      } catch (err) {
        setError(err.message);
        toast.error('Gagal memulai sesi chat.');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Listener untuk pesan baru yang masuk
    const handleReceiveMessage = (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    };
    socket.on('receiveMessage', handleReceiveMessage);

    // Cleanup listener saat komponen di-unmount
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [parentId]); // Jalankan ulang jika parentId berubah

  // Auto-scroll setiap kali ada pesan baru
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && room && currentUser) {
      const messageData = {
        room: room,
        sender: currentUser,
        message: newMessage,
      };
      socket.emit('sendMessage', messageData, (response) => {
        if (response.status !== 'ok') {
          toast.error('Gagal mengirim pesan.');
        }
      });
      setNewMessage('');
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> <p>Mempersiapkan chat...</p></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <h2>Chat dengan {parentId}</h2>
      <Card>
        <Card.Body style={{ height: '60vh', overflowY: 'auto' }}>
          <div className="d-flex flex-column" ref={messagesEndRef}>
            {messages.reduce((acc, msg, index) => {
              const currentDate = new Date(msg.timestamp).toLocaleDateString('id-ID');
              const lastMessage = messages[index - 1];
              const lastDate = lastMessage ? new Date(lastMessage.timestamp).toLocaleDateString('id-ID') : null;

              if (currentDate !== lastDate) {
                acc.push(
                  <div key={`date-${currentDate}-${index}`} className="text-center text-muted small my-3">
                    <span className="px-2 py-1 bg-light rounded">{new Date(msg.timestamp).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                );
              }

              acc.push(
                <div key={msg._id} className={`p-2 mb-2 rounded ${msg.sender.id === currentUser?.id ? 'bg-primary text-white align-self-end' : 'bg-light align-self-start'}`} style={{ maxWidth: '75%' }}>
                  {msg.message}
                  <div style={{ fontSize: '0.65rem', textAlign: 'right', marginTop: '5px' }}>{new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
              return acc;
            }, [])}
            <div ref={messagesEndRef} />
          </div>
        </Card.Body>
        <Card.Footer>
          <Form onSubmit={handleSendMessage}>
            <InputGroup>
              <Form.Control placeholder="Ketik pesan..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
              <Button variant="primary" type="submit"><BsSend /></Button>
            </InputGroup>
          </Form>
        </Card.Footer>
      </Card>
    </>
  );
}

export default DriverChatPage;