// Text
var TITLE = 'My Game Title';
var INSTRUCTIONS = `
Tap on the screen
to make me jump!
`;
var GAME_OVER_MESSAGE = 'GAME OVER';
var TRY_AGAIN_MESSAGE = 'TRY AGAIN?';


// Pictures
var MAIN_CHARACTER_HAPPY = 'assets/happy.png';
var MAIN_CHARACTER_SAD = 'assets/sad.png';
var FLOATY = 'assets/cloud.png';
var OBSTACLE = 'assets/obstacle.png';
var GROUND = 'assets/ground.png';


// Sounds
var MUSIC = 'assets/music.mp3';
var JUMP = 'assets/jump.mp3';
var SCORE = 'assets/yay.mp3';
var HIT = 'assets/dead.mp3';


// Cool game stuff
var BACKGROUND_COLOR = 'black';
var SKY_COLOR = 'aqua';
var MAIN_SIZE = 64;
var CLOUD_SIZE = 200;
var SPEED = 180;
var GRAVITY = 900;
var FLAP_STRENGTH = 420;
var SPAWN_RATE = 1.2;
var OPENING = 200;
var GAMEOVER_DELAY = 3000;
var WORLD_WIDTH = 480;
var WORLD_HEIGHT = 700;
var OBSTACLE_WIDTH = 80;
var DEBUG = false;

var FONT = 'Luckiest+Guy';


// Game code
var game,
    gameStarted,
    gameOver,
    score,
    bg,
    clouds,
    obstacles,
    invs,
    character,
    ground,
    scoreText,
    instText,
    gameOverText,
    music,
    flapSnd,
    scoreSnd,
    hurtSnd,
    obstaclesTimer,
    inputDisabled,
    gameOvers = 0;

function boot(parent, sky) {
    new Phaser.Game({
        type: Phaser.AUTO,
        physics: {
            default: 'arcade',
            arcade: {
                debug: DEBUG
            },
        },
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        scene: {
            preload: preload,
            create: create,
            update: update,
        },
        scale: {
            parent,
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
        },
        backgroundColor: sky,
        antialias: true,
    });
}

function preload() {
    var assets = {
        image: {
            happy: MAIN_CHARACTER_HAPPY,
            sad: MAIN_CHARACTER_SAD,
            floaty: FLOATY,
            obstacle: OBSTACLE,
            ground: GROUND,
        },
        audio: {
            flap: JUMP,
            score: SCORE,
            hurt: HIT,
            music: MUSIC,
        }
    };
    Object.keys(assets).forEach((type) => {
        Object.keys(assets[type]).forEach((id) => {
            this.load[type].apply(this.load, [id].concat(assets[type][id]));
        });
    });
}

function addText(x, y, config) {
    var style  = Object.assign({
        fontSize: '30px',
        fontFamily: `"${FONT.replace('+', ' ')}"`,
        fill: '#fff',
        stroke: BACKGROUND_COLOR,
        strokeThickness: 4,
        align: 'center'
    }, config)
    return this.add.text(x, y , '', style);
}

function getImageDimensions(key) {
    var src = this.textures.get(key).source[0];
    return {
        width: src.width,
        height: src.height,
    };
}
function create() {
    // Add clouds group
    clouds = this.physics.add.group();
    // Add obstacles
    obstacles = this.physics.add.group();
    // Add invisible thingies
    invs = this.physics.add.group();

    // Add character
    character = this.physics.add.sprite(0, 0, 'happy');
    character.setOrigin(0.5, 0.5);
    character.setDepth(1);
    character.inputEnabled = true;
    character.setCollideWorldBounds(true);

    // Add ground
    var dim = getImageDimensions.call(this, 'ground');
    ground = this.add.tileSprite(0, WORLD_HEIGHT, WORLD_WIDTH * 2, dim.height, 'ground');
    ground.setDepth(1);

    // Add score text
    scoreText = addText.call(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 4)
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(1);

    // Add instructions text
    instText = addText.call(
        this,
        WORLD_WIDTH / 2,
        WORLD_HEIGHT - WORLD_HEIGHT / 4,
        {
            fontSize: '16px',
        }
    );
    instText.setOrigin(0.5, 0.5);
    instText.setDepth(1);

    // Add game over text
    gameOverText = addText.call(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    gameOverText.setOrigin(0.5, 0.5);
    gameOverText.scaleX = 2;
    gameOverText.scaleY = 2;
    gameOverText.setDepth(1);
    gameOverText.setText(GAME_OVER_MESSAGE);

    // Add sounds
    music = this.sound.add('music');
    music.play({ loop: true });
    flapSnd = this.sound.add('flap');
    scoreSnd = this.sound.add('score');
    hurtSnd = this.sound.add('hurt');

    // Add controls
    this.input.on('pointerdown', flap);
    this.input.keyboard.on('keydown_SPACE', flap);

    spawnCloud.call(this);

    // RESET!
    reset();
}

function reset() {
    gameStarted = false;
    gameOver = false;
    score = 0;
    scoreText.setText(TITLE.split(' ').join('\n'));
    instText.setText(INSTRUCTIONS.trim());
    gameOverText.visible = false;
    character.setTexture('happy');
    var scale = MAIN_SIZE / character.height;
    character.setScale(scale, scale);
    character.angle = 0;
    character.setX(WORLD_WIDTH / 4);
    character.setY(WORLD_HEIGHT / 2);
    character.setGravityY(0);
    obstacles.clear(true);
    invs.clear(true);
}

function start() {
    // SPAWN FINGERS!
    obstaclesTimer = this.scene.time.addEvent({
        callback: spawnObstacles,
        loop: true,
        delay: SPAWN_RATE * 1000,
    })

    // Show score
    scoreText.setText(score);
    instText.visible = false;

    character.setGravityY(GRAVITY);

    // START!
    gameStarted = true;
}

function flap() {
    if (inputDisabled) {
        return;
    }

    if (!gameStarted) {
        start.call(this);
    }

    if (gameOver) {
        reset();
    } else {
        character.setVelocityY(-FLAP_STRENGTH);
        flapSnd.play();
    }
}

function spawnCloud() {
    this.time.addEvent({
        callback: () => {
            var cloudY = Math.random() * WORLD_HEIGHT / 2;
            var cloud = clouds.create(
                WORLD_WIDTH,
                cloudY,
                'floaty'
            );
            var rando = Math.random();
            var scale = CLOUD_SIZE * (rando + 0.5) / cloud.width;
            cloud.setOrigin(0, 0);
            cloud.setScale(scale, scale);
            cloud.alpha = 2 / (2 + rando);
            cloud.setVelocityX(-SPEED / (1.5 + rando));
            spawnCloud.call(this);
        },
        delay: Phaser.Math.Between(100,5000),
    });
}

function spawnObstacle(offset, flipped) {
    var obstacle = obstacles.create(0, 0, 'obstacle');
    var scale = OBSTACLE_WIDTH / obstacle.width;
    var centering = (obstacle.height * scale / 2) + (OPENING / 2);
    if (flipped) {
        centering = -centering;
        obstacle.setAngle(180);
    }

    obstacle.scaleX = obstacle.scaleY = scale;
    obstacle.setX(WORLD_WIDTH + OBSTACLE_WIDTH);
    obstacle.setY(WORLD_HEIGHT / 2 + centering + offset);
    // Move to the left
    obstacle.setVelocityX(-SPEED);

    return obstacle;
}

function spawnObstacles() {
    var offset = (Math.random() > 0.5 ? -1 : 1) * Math.random() * WORLD_HEIGHT / 6;
    // Bottom obstacle
    var botObstacle = spawnObstacle(offset);
    // Top obstacle (flipped)
    var topObstacle = spawnObstacle(offset, true);

    // Add invisible thingy
    var inv = invs.create(botObstacle.getTopRight().x, 0);
    inv.visible = false;
    inv.setOrigin(0, 0);
    inv.displayWidth = 2;
    inv.displayHeight = WORLD_HEIGHT;
    inv.setVelocityX(-SPEED);
}

function addScore(_, inv) {
    invs.remove(inv);
    score += 1;
    scoreText.setText(score);
    scoreSnd.play();
}

function setGameOver() {
    gameOver = true;
    instText.setText(TRY_AGAIN_MESSAGE);
    instText.visible = true;
    gameOverText.visible = true;

    // Stop all obstacles and invisible score barriers.
    obstacles.children.each(function(obstacle) {
        obstacle.body.velocity.x = 0;
    });
    invs.children.each(function(inv) {
        inv.body.velocity.x = 0;
    });

    hurtSnd.play();
    gameOvers++;
    obstaclesTimer.destroy();

    inputDisabled = true;
    setTimeout(() => {
        inputDisabled = false;
    }, 750);
}

function update(elapsed, delta) {
    if (gameStarted) {
        // Make character dive
        var dvy = FLAP_STRENGTH + character.body.velocity.y;
        character.angle = (90 * dvy / FLAP_STRENGTH) - 180;
        if (character.angle < -30) {
            character.angle = -30;
        }
        if (
            gameOver ||
            character.angle > 90 ||
            character.angle < -90
        ) {
            character.angle = 90;
        }

        // Birdie is DEAD!
        if (gameOver) {
            var targetScale = MAIN_SIZE * 2 / character.height;
            if (character.scaleX < targetScale) {
                character.scaleX *= 1.07;
                character.scaleY *= 1.07;
            }
            // Shake game over text
            gameOverText.angle = 3 * Math.cos(this.time.now / 100);
            character.setTexture('sad');
        } else { this.physics.overlap(character, obstacles, setGameOver);
            if (!gameOver && character.body.bottom >= WORLD_HEIGHT) {
                setGameOver();
            }
            // Add score
            this.physics.overlap(character, invs, addScore);
        }
        // Remove offscreen obstacles
        obstacles.children.each(function(obstacle) {
            if (obstacle.x + obstacle.width < 0) {
                obstacle.destroy();
            }
        });
        // Remove offscreen obstacles
        invs.children.each(function(inv) {
            if (inv.x + inv.width < 0) {
                inv.destroy();
            }
        });
    } else {
        character.y = (WORLD_HEIGHT / 2) + 8 * Math.cos(this.time.now / 200);
    }
    if (!gameStarted || gameOver) {
        // Shake instructions and score
        instText.scaleX = 2 + 0.1 * Math.sin(this.time.now / 100);
        instText.scaleY = 2 + 0.1 * Math.cos(this.time.now / 100);
        scoreText.scaleX = 2 + 0.1 * Math.sin(this.time.now / 100);
        scoreText.scaleY = 2 + 0.1 * Math.cos(this.time.now / 100);
    }

    // Remove offscreen clouds
    clouds.children.each(function(cloud) {
        if (cloud.body.right < 0) {
            cloud.destroy();
        }
    });

    // Scroll ground
    if (!gameOver) {
        ground.tilePositionX += delta * SPEED / ground.potWidth;
    }
}

function init(parent) {
    parent.style.backgroundColor = SKY_COLOR;
    var sky = window.getComputedStyle(parent).backgroundColor;
    parent.style.backgroundColor = BACKGROUND_COLOR;
    // Make sure to Load our Font before we start.
    WebFontConfig = {
        google: { families: [ FONT ] },
        active: boot.bind(this, parent, sky),
    };

    var wf = document.createElement('script');
    wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
}
