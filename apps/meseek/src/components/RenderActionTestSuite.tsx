import { Doc } from 'convex/_generated/dataModel';
import { z } from 'zod/v3';
import { cn } from '@reactor/ui/lib/utils';
import { RenderAction } from './actions/RenderAction';

// Test examples for comprehensive coverage
const testExamples: TestExample[] = [
	// Test 1: Working export const (should work after transpilation)
	{
		name: 'export const Composition = () => {}',
		code: `window.Composition =  () => {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-green-500"
  }, "\u2705 Export Const Works!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "This uses export const Composition"));
};`,
		description: 'Tests export const syntax transpilation',
	},

	// Test 2: Working regular const (should work directly)
	{
		name: 'const Composition = () => {}',
		code: `const Composition = () => {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-blue-500"
  }, "\u2705 Regular Const Works!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "This uses const Composition"));
};`,
		description: 'Tests regular const syntax',
	},

	// Test 3: Working function declaration (should work directly)
	{
		name: 'function Composition() {}',
		code: `function Composition() {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-purple-500"
  }, "\u2705 Function Declaration Works!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "This uses function Composition()"));
}`,
		description: 'Tests function declaration syntax',
	},

	// Test 4: Wrong component name (should show "Nothing to render")
	{
		name: 'const WrongName = () => {}',
		code: `const WrongName = () => {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-red-500"
  }, "\u274C This shouldn't render"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "Component is called WrongName, not Composition"));
}`,
		description: 'Tests component name mismatch',
	},

	// Test 5: Syntax error (should show error)
	{
		name: 'Syntax Error',
		code: `const Composition = () => {
			return (
				<div className="p-4 text-center">
					<h1 className="text-xl font-bold">This has a syntax error</h1>
				</div>
			); // Missing closing brace
		`,
		description: 'Tests syntax error',
	},

	// Test 6: Runtime error (should show error)
	{
		name: 'Runtime Error',
		code: `const Composition = () => {
  // This will cause a runtime error
  nonExistentFunction();
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold"
  }, "This shouldn't render"));
};`,
		description: 'Tests runtime error',
	},

	// Test 7: Dynamic content with hooks
	{
		name: 'Dynamic Content',
		code: `const Composition = () => {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-orange-500"
  }, "\uD83D\uDD04 Dynamic Content!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "Count: ", count), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCount(c => c + 10),
    className: "mt-2 px-3 py-1 bg-blue-500 text-white rounded"
  }, "+10"));
};`,
		description: 'Tests dynamic content with hooks',
	},

	// Test 8: Complex interactive content
	{
		name: 'Interactive Game',
		code: `const Composition = () => {
  const [score, setScore] = React.useState(0);
  const [gameActive, setGameActive] = React.useState(false);
  const handleClick = () => {
    if (gameActive) {
      setScore(s => s + 1);
    }
  };
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setTimeout(() => setGameActive(false), 5000);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl font-bold text-indigo-500"
  }, "\uD83C\uDFAE Click Game!"), !gameActive ? /*#__PURE__*/React.createElement("button", {
    onClick: startGame,
    className: "mt-2 px-4 py-2 bg-green-500 text-white rounded"
  }, "Start 5-second game!") : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "Score: ", score), /*#__PURE__*/React.createElement("button", {
    onClick: handleClick,
    className: "mt-2 px-4 py-2 bg-red-500 text-white rounded animate-pulse"
  }, "CLICK ME!")));
};`,
		description: 'Tests complex interactive content',
	},

	// Test 9: Responsive Fish Game
	{
		name: 'Responsive Fish Game',
		code: `const Composition = () => {
  const canvasRef = React.useRef(null);
  const [gameState, setGameState] = React.useState('menu'); // menu, playing, gameOver
  const [score, setScore] = React.useState(0);
  const [highScore, setHighScore] = React.useState(0);

  // Game variables - RESPONSIVE TO CANVAS SIZE
  const gameRef = React.useRef({
    fish: {
      x: 0,
      y: 0,
      velocity: 0,
      size: 30
    },
    obstacles: [],
    gameSpeed: 1.2,
    gravity: 0.3,
    jumpStrength: -9.5,
    obstacleGap: 220,
    obstacleWidth: 80,
    obstacleSpacing: 350,
    frameCount: 0,
    canvasWidth: 800,
    canvasHeight: 400
  });

  // Initialize canvas and game loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Make canvas use ALL available space
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // Update game dimensions
      gameRef.current.canvasWidth = rect.width;
      gameRef.current.canvasHeight = rect.height;
      // Reset fish position for new dimensions
      gameRef.current.fish.x = rect.width * 0.125; // 12.5% from left
      gameRef.current.fish.y = rect.height * 0.5; // center vertically
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game loop
    let animationId;
    const gameLoop = () => {
      if (gameState === 'playing') {
        updateGame();
        drawGame(ctx, canvas);
      } else {
        drawGame(ctx, canvas); // Still draw for menu/game over states
      }
      animationId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState]);
  const updateGame = () => {
    const game = gameRef.current;

    // Update fish with ceiling bounce (prevents sticking to ceiling)
    game.fish.velocity += game.gravity;
    game.fish.y += game.fish.velocity;

    // Gentle ceiling bounce instead of instant game over
    if (game.fish.y - game.fish.size < 0) {
      game.fish.y = game.fish.size;
      game.fish.velocity = Math.max(0, game.fish.velocity * 0.3); // Soft bounce
    }

    // Generate obstacles - responsive to canvas size
    game.frameCount++;
    if (game.frameCount % 140 === 0) {
      const margin = game.canvasHeight * 0.1; // 10% margin
      const availableSpace = game.canvasHeight - game.obstacleGap - margin * 2;
      const gapY = Math.random() * availableSpace + margin;
      game.obstacles.push({
        x: game.canvasWidth,
        topHeight: gapY,
        bottomY: gapY + game.obstacleGap,
        bottomHeight: game.canvasHeight - gapY - game.obstacleGap,
        passed: false
      });
    }

    // Update obstacles
    game.obstacles.forEach(obstacle => {
      obstacle.x -= game.gameSpeed;
    });

    // Remove off-screen obstacles
    game.obstacles = game.obstacles.filter(obstacle => obstacle.x + game.obstacleWidth > 0);

    // Check collisions - more forgiving
    checkCollisions();

    // Update score
    game.obstacles.forEach(obstacle => {
      if (!obstacle.passed && obstacle.x + game.obstacleWidth < game.fish.x) {
        obstacle.passed = true;
        setScore(prev => prev + 1);
      }
    });
  };
  const checkCollisions = () => {
    const game = gameRef.current;
    const fish = game.fish;

    // Ground collision only (ceiling handled with bounce)
    if (fish.y + fish.size > game.canvasHeight) {
      gameOver();
      return;
    }

    // Obstacle collision - very forgiving hitbox
    const collisionMargin = 8; // Even more forgiving collision
    game.obstacles.forEach(obstacle => {
      if (fish.x + fish.size - collisionMargin > obstacle.x && fish.x - fish.size + collisionMargin < obstacle.x + game.obstacleWidth) {
        if (fish.y - fish.size + collisionMargin < obstacle.topHeight || fish.y + fish.size - collisionMargin > obstacle.bottomY) {
          gameOver();
        }
      }
    });
  };
  const drawGame = (ctx, canvas) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ocean background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#001f3f');
    gradient.addColorStop(1, '#003366');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bubbles - scale with canvas size
    const bubbleCount = Math.floor(canvas.width * canvas.height / 20000); // Dynamic bubble count
    for (let i = 0; i < bubbleCount; i++) {
      const x = (Date.now() / 50 + i * (canvas.width / bubbleCount)) % canvas.width;
      const y = (Date.now() / 30 + i * (canvas.height / bubbleCount)) % canvas.height;
      const radius = Math.abs(Math.sin(Date.now() / 1000 + i)) * 3 + 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fish
    const fish = gameRef.current.fish;
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.ellipse(fish.x, fish.y, fish.size, fish.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fish tail
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(fish.x - fish.size, fish.y);
    ctx.lineTo(fish.x - fish.size - 15, fish.y - 10);
    ctx.lineTo(fish.x - fish.size - 15, fish.y + 10);
    ctx.closePath();
    ctx.fill();

    // Fish eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(fish.x + 10, fish.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(fish.x + 12, fish.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw coral obstacles
    gameRef.current.obstacles.forEach(obstacle => {
      // Top coral
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(obstacle.x, 0, gameRef.current.obstacleWidth, obstacle.topHeight);

      // Coral details
      ctx.fillStyle = '#ff6b7a';
      for (let i = 0; i < obstacle.topHeight; i += 20) {
        ctx.fillRect(obstacle.x + 10, i, gameRef.current.obstacleWidth - 20, 10);
      }

      // Bottom coral
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(obstacle.x, obstacle.bottomY, gameRef.current.obstacleWidth, obstacle.bottomHeight);

      // Coral details
      ctx.fillStyle = '#ff6b7a';
      for (let i = obstacle.bottomY; i < canvas.height; i += 20) {
        ctx.fillRect(obstacle.x + 10, i, gameRef.current.obstacleWidth - 20, 10);
      }
    });
  };
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 800;
    const height = canvas ? canvas.height : 400;
    gameRef.current = {
      fish: {
        x: width * 0.125,
        y: height * 0.5,
        velocity: 0,
        size: 30
      },
      obstacles: [],
      gameSpeed: 1.2,
      gravity: 0.3,
      jumpStrength: -9.5,
      obstacleGap: 220,
      obstacleWidth: 80,
      obstacleSpacing: 350,
      frameCount: 0,
      canvasWidth: width,
      canvasHeight: height
    };
  };
  const gameOver = () => {
    setGameState('gameOver');
    if (score > highScore) {
      setHighScore(score);
    }
  };
  const jump = () => {
    if (gameState === 'playing') {
      gameRef.current.fish.velocity = gameRef.current.jumpStrength;
    }
  };
  const handleKeyPress = e => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'menu' || gameState === 'gameOver') {
        startGame();
      } else {
        jump();
      }
    }
  };
  const handleClick = () => {
    if (gameState === 'menu' || gameState === 'gameOver') {
      startGame();
    } else {
      jump();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "h-full w-full min-h-full flex flex-col bg-gradient-to-b from-blue-900 to-blue-700 p-0",
    onKeyDown: handleKeyPress,
    tabIndex: 0
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 left-1/2 transform -translate-x-1/2 text-center z-10"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl sm:text-4xl font-bold text-white mb-1"
  }, "\uD83D\uDC20 Perfectly Balanced Aquatic Fish"), /*#__PURE__*/React.createElement("div", {
    className: "text-white text-sm sm:text-xl"
  }, "Score: ", score, " | High Score: ", highScore)), /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    className: "border-2 sm:border-4 border-blue-400 rounded-lg cursor-pointer w-full h-full",
    onClick: handleClick,
    style: {
      background: 'linear-gradient(to bottom, #001f3f, #003366)'
    }
  }), gameState === 'menu' && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-white mb-4"
  }, "Perfectly Balanced! \uD83C\uDFAF"), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-2"
  }, "\u2705 Jump height fixed - no more ceiling hits!"), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-2"
  }, "\u2705 Generous gaps between obstacles"), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-2"
  }, "\u2705 Smooth, controlled swimming"), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-4"
  }, "Click or press SPACE to start swimming"), /*#__PURE__*/React.createElement("button", {
    onClick: startGame,
    className: "px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
  }, "Start Game")), gameState === 'gameOver' && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-white mb-4"
  }, "Game Over!"), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-2"
  }, "Final Score: ", score), /*#__PURE__*/React.createElement("p", {
    className: "text-white mb-4"
  }, "High Score: ", highScore), /*#__PURE__*/React.createElement("button", {
    onClick: startGame,
    className: "px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
  }, "Try Again"))), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-white shrink-0 mt-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs sm:text-sm"
  }, "Click or press SPACE to make the fish swim up!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-1 opacity-75"
  }, "Perfectly balanced - challenging but fair! \uD83C\uDFAE"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs mt-1 text-green-300"
  }, "Jump: -9.5 | Gravity: 0.3 | Gap: 220 | Speed: 1.2")));
};`,
		description: 'Tests a complex interactive game with state, hooks, and event handling',
	},

	// Test 10: Theme Variables & shadcn Components Test
	{
		name: 'Theme Variables & shadcn Components',
		code: `const Composition = () => {
  const [count, setCount] = React.useState(0);
  const [isChecked, setIsChecked] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [selectedTab, setSelectedTab] = React.useState('tab1');
  return /*#__PURE__*/React.createElement("div", {
    className: "p-6 space-y-6 bg-background text-foreground min-h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold mb-2"
  }, "\uD83C\uDFA8 Theme Variables Test"), /*#__PURE__*/React.createElement("p", {
    className: "text-muted-foreground"
  }, "Testing shadcn-like components with proper theme integration")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Button Variants"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
  }, "Primary"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
  }, "Secondary"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors"
  }, "Accent"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 border border-border bg-background text-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
  }, "Outline"), /*#__PURE__*/React.createElement("button", {
    className: "px-4 py-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
  }, "Ghost"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Card Component"), /*#__PURE__*/React.createElement("div", {
    className: "border border-border rounded-lg bg-card text-card-foreground shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold mb-2"
  }, "Card Title"), /*#__PURE__*/React.createElement("p", {
    className: "text-muted-foreground mb-4"
  }, "This card uses proper theme variables for background, border, and text colors."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isChecked,
    onChange: e => setIsChecked(e.target.checked),
    className: "w-4 h-4 accent-primary"
  }), /*#__PURE__*/React.createElement("label", {
    className: "text-sm"
  }, "Checkbox using theme accent: ", isChecked ? '✅ Checked' : '⬜ Unchecked'))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Input Components"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium mb-1"
  }, "Text Input"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: inputValue,
    onChange: e => setInputValue(e.target.value),
    placeholder: "Type something...",
    className: "w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-muted-foreground mt-1"
  }, 'Value: ", inputValue, "')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium mb-1"
  }, "Counter"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCount(c => c - 1),
    className: "w-8 h-8 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
  }, "-"), /*#__PURE__*/React.createElement("span", {
    className: "px-4 py-2 bg-muted text-muted-foreground rounded min-w-[3rem] text-center"
  }, count), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCount(c => c + 1),
    className: "w-8 h-8 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
  }, "+"))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Tabs Component"), /*#__PURE__*/React.createElement("div", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex border-b border-border"
  }, ['tab1', 'tab2', 'tab3'].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab,
    onClick: () => setSelectedTab(tab),
    className: selectedTab === tab ? 'px-4 py-2 text-sm font-medium transition-colors border-b-2 border-primary text-primary' : 'px-4 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground'
  }, tab === 'tab1' ? 'Overview' : tab === 'tab2' ? 'Details' : 'Settings'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 bg-muted rounded-md"
  }, selectedTab === 'tab1' && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDCCA Overview content with proper muted background and foreground colors."), selectedTab === 'tab2' && /*#__PURE__*/React.createElement("p", null, "\uD83D\uDCCB Details panel showing theme variable integration."), selectedTab === 'tab3' && /*#__PURE__*/React.createElement("p", null, "\u2699\uFE0F Settings page with consistent color scheme.")))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Badge Components"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full"
  }, "Primary Badge"), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full"
  }, "Secondary Badge"), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full"
  }, "Accent Badge"), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 border border-border bg-background text-foreground text-xs font-medium rounded-full"
  }, "Outline Badge"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Alert Component"), /*#__PURE__*/React.createElement("div", {
    className: "border border-border rounded-md bg-background p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start space-x-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-primary-foreground text-xs"
  }, "\u2139")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-medium text-foreground"
  }, "Theme Integration Success!"), /*#__PURE__*/React.createElement("p", {
    className: "text-muted-foreground text-sm mt-1"
  }, "All components are properly using CSS custom properties from the host theme. Colors automatically adapt to light/dark mode."))))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-semibold"
  }, "Current Theme Colors"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-background border border-border rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-background border border-border rounded mb-1"
  }), "background"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-primary text-primary-foreground rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-primary rounded mb-1"
  }), "primary"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-secondary text-secondary-foreground rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-secondary rounded mb-1"
  }), "secondary"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-accent text-accent-foreground rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-accent rounded mb-1"
  }), "accent"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-muted text-muted-foreground rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-muted rounded mb-1"
  }), "muted"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 border border-border bg-background rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 border border-border bg-background rounded mb-1"
  }), "border"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 border border-input bg-background rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 border border-input bg-background rounded mb-1"
  }), "input"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-background rounded text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-8 bg-background ring-2 ring-ring rounded mb-1"
  }), "ring"))));
};`,
		description: 'Tests theme variables and shadcn-like components',
	},
];

export function RenderActionTestSuite({ className }: { className?: string }) {
	//
	return (
		<div className={cn(className)}>
			{testExamples.map((example, index) => (
				<div key={index}>
					<div className="bg-muted px-3 py-2 text-sm font-medium">
						#{index + 1}: {example.name}
						{example.description && (
							<span className="text-muted-foreground text-xs ml-2">- {example.description}</span>
						)}
					</div>
					<RenderAction
						action={createTestAction(example.code)}
						isAuthorCurrentUser={false}
						initialRenderDate={new Date()}
						taskId={createTestAction(example.code).taskId}
					/>
				</div>
			))}
		</div>
	);
}

function createTestAction(code: string, actionId?: string) {
	//
	return {
		_id: actionId || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		_creationTime: Date.now(),
		taskId: 'test-task-id',
		owner: 'test-user-id',
		author: 'test-user-id',
		depth: 0,
		skillKey: 'render',
		args: {
			code: code,
		},
		status: 'succeeded' as const,
		result: {
			text: code,
		},
		estimatedCost: BigInt(100),
		approvedAt: Date.now(),
		approvedBy: 'auto' as const,
	} as unknown as Doc<'actions'>;
}

/**
 * Test example schema for RenderAction testing
 */
const testExampleSchema = z.object({
	name: z.string().min(1, 'Test name is required'),
	code: z.string().min(1, 'Test code is required'),
	description: z.string().optional(),
});

/**
 * Test example interface inferred from schema
 */
type TestExample = z.infer<typeof testExampleSchema>;
