// Sound effects for the chat application
let audioContext: AudioContext | null = null;

// Initialize audio context on user interaction
export const initAudio = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play message sent sound - louder with lower pitch
export const playMessageSentSound = () => {
  try {
    const context = initAudio();
    if (!context) return;
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(900, context.currentTime); // Lower starting frequency
    oscillator.frequency.exponentialRampToValueAtTime(450, context.currentTime + 0.15); // Lower ending frequency
    
    gainNode.gain.setValueAtTime(0.25, context.currentTime); // Increased volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch (error) {
    console.error('Error playing message sent sound:', error);
  }
};

// Play message received sound
export const playMessageReceivedSound = () => {
  try {
    const context = initAudio();
    if (!context) return;
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(700, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1000, context.currentTime + 0.12);
    
    gainNode.gain.setValueAtTime(0.15, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.12);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch (error) {
    console.error('Error playing message received sound:', error);
  }
};

// Play AI message sound
export const playAIMessageSound = () => {
  try {
    const context = initAudio();
    if (!context) return;
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.15, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch (error) {
    console.error('Error playing AI message sound:', error);
  }
};

// Play room entry sound
export const playRoomEntrySound = () => {
  try {
    const context = initAudio();
    if (!context) return;
    
    // Create two oscillators for a more complex sound
    const oscillator1 = context.createOscillator();
    const oscillator2 = context.createOscillator();
    const gainNode = context.createGain();
    
    // First oscillator - rising tone
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(300, context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(600, context.currentTime + 0.3);
    
    // Second oscillator - higher tone
    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(600, context.currentTime + 0.1);
    oscillator2.frequency.exponentialRampToValueAtTime(900, context.currentTime + 0.3);
    
    // Volume control
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
    
    // Connect everything
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Play the sound
    oscillator1.start(context.currentTime);
    oscillator2.start(context.currentTime + 0.1);
    oscillator1.stop(context.currentTime + 0.4);
    oscillator2.stop(context.currentTime + 0.4);
  } catch (error) {
    console.error('Error playing room entry sound:', error);
  }
};