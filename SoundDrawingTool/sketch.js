// Sound Drawing Tool
// Draw with mouse, different sound modes play back together with animation when you release

let c;
let lineModuleSize = 100;
let angle = 0;
let angleSpeed = 1;
let clickPosX = 0;
let clickPosY = 0;

let drawingData = [];
let currentStroke = null;
let isDrawing = false;
let isPlaying = false;

// UI margins
let bottomUIHeight = 80;
let drawingAreaHeight;

let pianoSynth;
let violinSynth;
let guitarSynth;
let playbackIndices = [];
let playbackStrokes = [];
let lastPlayTime = 0;
let timePerPoint = 20;
 // 'piano', 'violin', or 'guitar' mode

// Replay button properties
let replayButton = {
  x: 0,
  y: 0,
  width: 120,
  height: 40,
  isHovered: false
};

const notes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 
               'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
               'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawingAreaHeight = height - bottomUIHeight;
  updateReplayButtonPosition();
  background(255);
  cursor(CROSS);
  strokeWeight(0.75);
  c = color(235, 115, 221);
  
  // Initialize Piano synth - bright and clear
  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { 
      type: 'sine'
    },
    envelope: {
      attack: 0.005,
      decay: 0.3,
      sustain: 0.1,
      release: 1.0
    }
  }).toDestination();
  
  pianoSynth.volume.value = 0;
  
  // Initialize Violin synth - gentle and sweet
  violinSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { 
      type: 'sine'
    },
    envelope: {
      attack: 0.15,
      decay: 0.2,
      sustain: 0.5,
      release: 1.5
    }
  }).toDestination();
  
  violinSynth.volume.value = -2;
  
  // Initialize Nylon Guitar synth - warm and plucky
  guitarSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { 
      type: 'triangle'
    },
    envelope: {
      attack: 0.008,
      decay: 0.6,
      sustain: 0.1,
      release: 1.8
    }
  }).toDestination();
  
  guitarSynth.volume.value = -2;
  
  currentMode = 'piano';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  drawingAreaHeight = height - bottomUIHeight;
  updateReplayButtonPosition();
  redrawAll();
}

function updateReplayButtonPosition() {
  replayButton.x = width / 2 - replayButton.width / 2;
  replayButton.y = height - bottomUIHeight / 2 - replayButton.height / 2;
}

function draw() {
  if (isDrawing && mouseIsPressed && mouseButton === LEFT) {
    let x = mouseX;
    let y = mouseY;
    
    let point = {
      x: x,
      y: y,
      angle: angle,
      color: c,
      size: lineModuleSize,
      mode: currentMode
    };
    
    currentStroke.points.push(point);
    drawPoint(point);
    angle += angleSpeed;
  }
  
  // Playback animation - all strokes play simultaneously
  if (isPlaying && playbackStrokes.length > 0) {
    if (millis() - lastPlayTime > timePerPoint) {
      redrawAll();
      
      let allFinished = true;
      
      // Play all strokes at the same time
      for (let i = 0; i < playbackStrokes.length; i++) {
        let currentStroke = playbackStrokes[i];
        let index = playbackIndices[i];
        
        if (index < currentStroke.points.length) {
          allFinished = false;
          
          let point = currentStroke.points[index];
          
          // Draw current point larger for each active stroke
          push();
          translate(point.x, point.y);
          rotate(radians(point.angle));
          stroke(point.color);
          strokeWeight(3);
          line(0, 0, point.size * 1.5, point.size * 1.5);
          pop();
          
          // Play note every 2 points for more variety
          if (index % 2 === 0) {
            let note = getNoteFromPosition(point.x, point.y);
            let velocity = min(point.y / height * 0.8, 0.6);
            //to limit the velocity
            
            if (point.mode === 'piano') {
              pianoSynth.triggerAttackRelease(note, '4n', undefined, velocity);
            } else if (point.mode === 'violin') {
              violinSynth.triggerAttackRelease(note, '2n', undefined, velocity * 0.8);// to reduce the heaviness of violin
            } else if (point.mode === 'guitar') {
              guitarSynth.triggerAttackRelease(note, '4n', undefined, velocity * 0.9);
            }
            
            // Check if we have multiple instruments before adding harmony
            let modes = new Set();
            for (let stroke of playbackStrokes) {
              if (stroke.points.length > 0) {
                modes.add(stroke.points[0].mode);
              }
            }
            
            // Only add harmony if multiple instruments are present
            if (modes.size >= 2 && random() < 0.12) {
              let harmonyOffset = floor(random(4, 7));
              let harmonyNote = notes[min(notes.indexOf(note) + harmonyOffset, notes.length - 1)];
              
              if (point.mode === 'piano') {
                violinSynth.triggerAttackRelease(harmonyNote, '2n', undefined, velocity * 0.2);
              } else if (point.mode === 'violin') {
                guitarSynth.triggerAttackRelease(harmonyNote, '4n', undefined, velocity * 0.2);
              } else if (point.mode === 'guitar') {
                pianoSynth.triggerAttackRelease(harmonyNote, '4n', undefined, velocity * 0.2);
              }
            }
          }
          
          playbackIndices[i]++;
        }
      }
      
      if (allFinished) {
        // Playback finished
        isPlaying = false;
        playbackStrokes = [];
        playbackIndices = [];
        redrawAll();
        document.getElementById('status').textContent = '';
      }
      
      lastPlayTime = millis();
    }
  }
  
  // Always draw the UI area
  drawUI();
}

function drawPoint(point) {
  push();
  translate(point.x, point.y);
  rotate(radians(point.angle));
  stroke(point.color);
  strokeWeight(0.75);
  line(0, 0, point.size, point.size);
  pop();
}

function redrawAll() {
  background(255);
  
  // Draw a subtle line separating drawing area from UI
  stroke(220);
  strokeWeight(1);
  line(0, drawingAreaHeight, width, drawingAreaHeight);
  
  for (let drawStroke of drawingData) {
    for (let point of drawStroke.points) {
      drawPoint(point);
    }
  }
}

function drawUI() {
  // Check if mouse is over button
  replayButton.isHovered = mouseX > replayButton.x && 
                           mouseX < replayButton.x + replayButton.width &&
                           mouseY > replayButton.y && 
                           mouseY < replayButton.y + replayButton.height;
  
  // Draw separator line
  stroke(220);
  strokeWeight(1);
  line(0, drawingAreaHeight, width, drawingAreaHeight);
  
  // Draw replay button
  push();
  
  // Button background
  if (replayButton.isHovered && !isPlaying && drawingData.length > 0) {
    fill(100);
    cursor(HAND);
  } else if (isPlaying || drawingData.length === 0) {
    fill(200);
    cursor(CROSS);
  } else {
    fill(150);
    cursor(CROSS);
  }
  
  noStroke();
  rectMode(CORNER);
  rect(replayButton.x, replayButton.y, replayButton.width, replayButton.height, 8);
  
  // Button text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(BOLD);
  
  if (isPlaying) {
    text('♪ Playing...', replayButton.x + replayButton.width / 2, replayButton.y + replayButton.height / 2);
  } else {
    text('⟲ Replay', replayButton.x + replayButton.width / 2, replayButton.y + replayButton.height / 2);
  }
  
  pop();
  
  // Reset cursor if not over button and in drawing area
  if (!replayButton.isHovered && mouseY < drawingAreaHeight) {
    cursor(CROSS);
  }
}

function getNoteFromPosition(x, y) {
  let noteIndex = floor((x / width) * notes.length);
  noteIndex = constrain(noteIndex, 0, notes.length - 1);
  return notes[noteIndex];
}

function mousePressed() {
  // Check if clicking on replay button
  if (replayButton.isHovered && !isPlaying && drawingData.length > 0) {
    startPlaybackAll();
    return;
  }
  
  // Only allow drawing in the drawing area
  if (mouseY >= drawingAreaHeight || isPlaying) return;
  
  isDrawing = true;
  lineModuleSize = random(50, 160);
  clickPosX = mouseX;
  clickPosY = mouseY;
  
  currentStroke = {
    points: [],
  };
}

function mouseReleased() {
  if (!isDrawing) return;
  
  isDrawing = false;
  
  if (currentStroke && currentStroke.points.length > 0) {
    drawingData.push(currentStroke);
    startPlaybackAll();
  }
  
  currentStroke = null;
}

async function startPlaybackAll() {
  await Tone.start();
  
  if (drawingData.length === 0) return;
  
  // Play all strokes simultaneously
  playbackStrokes = drawingData.slice(); // Copy all strokes
  playbackIndices = new Array(playbackStrokes.length).fill(0);
  
  isPlaying = true;
  lastPlayTime = millis();
  
  document.getElementById('status').textContent = '♪ Playing Symphony...';
}

function keyReleased() {
  if (keyCode === DELETE || keyCode === BACKSPACE) {
    background(255);
    drawingData = [];
    currentStroke = null;
    redrawAll();
  }
  
  // Piano mode with yellow color
  if (key === '1') {
    currentMode = 'piano';
    c = color(235, 115, 221);
  }
  
  // Violin mode with warm purple color
  if (key === '2') {
    currentMode = 'violin';
    c = color(138, 43, 226);
  }
  
  // Nylon Guitar mode with warm orange color
  if (key === '3') {
    currentMode = 'guitar';
    c = color(255, 140, 0);
  }
}