import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, InputGroup } from 'react-bootstrap';
import { BsSend } from 'react-icons/bs';
import { dummyMessages } from '../../data/dummyData';

function Chat() {
  const [messages, setMessages] = useState(dummyMessages);
  const [newMessage, setNewMessage] = useState('');
  const chatBodyRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const messageToSend = {
      from: 'parent',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, messageToSend]);
    setNewMessage('');

    // Simulasi balasan dari supir setelah 2 detik
    setTimeout(() => {
      const replyMessage = { from: 'driver', text: 'Baik, pesan Anda sudah kami terima.', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, replyMessage]);
    }, 2000);
  };

  useEffect(() => {
    // Auto-scroll to the bottom when new messages are added
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card>
      <Card.Header as="h3" className="bg-white">Chat with Driver/Admin</Card.Header>
      <Card.Body ref={chatBodyRef} style={{ height: '50vh', overflowY: 'auto' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 d-flex ${msg.from === 'parent' ? 'justify-content-end' : 'justify-content-start'}`}>
            <div 
              className={`p-2 rounded ${msg.from === 'parent' ? 'bg-primary text-white' : 'bg-light'}`}
              style={{ maxWidth: '75%' }}
            >
              <div>{msg.text}</div>
              <div className={`text-end ${msg.from === 'parent' ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>{msg.time}</div>
            </div>
          </div>
        ))}
      </Card.Body>
      <Card.Footer>
        <InputGroup>
          <Form.Control
            placeholder="Type a message..."
            aria-label="Type a message"
          />
          <Button variant="primary">
            <BsSend />
          </Button>
        </InputGroup>
      </Card.Footer>
    </Card>
  );
}

export default Chat;