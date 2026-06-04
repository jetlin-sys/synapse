import React from 'react';
import { MeetingRoomBoard } from '../components/meeting/MeetingRoomBoard';

export function MeetingRoomPage() {
  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
      <MeetingRoomBoard />
    </div>
  );
}
