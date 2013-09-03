(function() {
    var w = window;
    var requestAnimationFrame =
        w.requestAnimationFrame ||
        w.oRequestAnimationFrame ||
        w.mozRequestAnimationFrame ||
        w.webkitRequestAnimationFrame ||
        w.msRequestAnimationFrame;

    if (!requestAnimationFrame) {
        var lastTime = 0;
        requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = w.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    var width = 600;
    var height = 800;

    function constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function random() {
        return Math.random();
    }

    function blobInRect(blob, x, y, w, h) {
        var closestX = constrain(blob.x, x, x + w);
        var closestY = constrain(blob.y, y, y + h);

        // Calculate the distance between the circle's center and this closest point
        var distanceX = blob.x - closestX;
        var distanceY = blob.y - closestY;

        // If the distance is less than the circle's radius, an intersection occurs
        var distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (blob.radius * blob.radius);
    }

    var Tunnel = klass(function() {
        this.width = 90;
        this.height = 20;
        this.gateRadius = new Blob();
        this.init();
    })
    .methods({
        // minimum offset from edges
        offset: 50,

        init: function() {
            this.y = random() * height - height;
            this.start = constrain(random() * width, this.offset, width - this.offset - this.width);
            this.end = this.start + this.width;
            this.passed = false;
        },

        draw: function(ctx) {
            var height = this.height;
            var bottom = this.y;
            var top = bottom - height;
            ctx.beginPath();

            ctx.moveTo(0, top);
            ctx.lineTo(this.start, top);
            ctx.lineTo(this.start, bottom);
            ctx.lineTo(0, bottom);

            ctx.moveTo(width, top);
            ctx.lineTo(this.end, top);
            ctx.lineTo(this.end, bottom);
            ctx.lineTo(width, bottom);

            ctx.closePath();

            ctx.fillStyle = "#ea4a18";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#ffac2c";
            ctx.stroke();
        },

        top: function() {
            return this.y - this.height;
        },

        intersectsWith: function(blob) {
            return blobInRect(blob, 0, this.y - this.height, this.start, this.height) ||
                   blobInRect(blob, this.end, this.y - this.height, width - this.end, this.height);
        },

        interact: function(player) {
            if (this.intersectsWith(player)) {
                player.radius = 0;
            } else if (!player.dead() && !this.passed && this.top() > player.y + player.radius) {
                this.passed = true;
            }
        },

        afterInit: function(game) {
            var enemies = game.enemies;
            var gateRadius = this.gateRadius;
            var enemy;

            gateRadius.x = (this.start + this.end) / 2;
            gateRadius.y = this.y - this.height / 2;
            gateRadius.radius = 2*this.height;

            for (var i = 0; i < enemies.length; i++) {
                enemy = enemies[i];

                if (blobInRect(enemy, 0, this.y-this.height, width, this.height) || gateRadius.overlap(enemy)) {
                    enemy.radius = 0;
                }
            }
        }
    });

    var Blob = klass(function() {
        this.init();
    })
    .methods({
        init: function() {
            this.radius = Math.max(5, random() * 30);
            this.x = random() * width;
            this.y = random() * height - height;
        },

        draw: function(ctx) {
            var radius = this.radius;

            if (radius == 0 || this.y + radius < 0) {
                return;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = this.strokeColor;
            ctx.stroke();
        },

        centerDistance: function(other) {
            return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
        },

        top: function() {
            return this.y - this.radius;
        },

        overlap: function(other) {
            var r = this.radius;
            var R = other.radius;

            var d = this.centerDistance(other);
            var overlapDistance = (r + R - d) / 2;
            return (R && overlapDistance > 0);
        },

        interact: function(player) {
            var r = this.radius;
            var R = player.radius;

            var d = this.centerDistance(player);
            var overlapDistance = (r + R - d) / 2;
            var overlap =  (R && overlapDistance > 0);

            if (r > R) {
                this.color = "#ea4a18";
                this.strokeColor = "#ffac2c";
            } else {
                this.color = "#317393";
                this.strokeColor = "#82c0cf";
            }

            if (overlap) {
                var pi = Math.PI;
                var mod = r < R ? -1 : 1;
                while (R && r && (r + R - d) > 0) {
                    this.radius = r = Math.max(0, r + mod/r);
                    player.radius = R = Math.max(0, R - mod/R);
                    player.score += 1;
                    d = this.centerDistance(player);
                }

            }
        }
    });

    var Player = Blob.extend(function() {
        this.radius = 10;

        this.x = width / 2;
        this.y = height * 7/8;

        this.color = '#cccccc';
        this.strokeColor = '#f1f1f1';

        this.speed = 0;

        this.progress = 0;
        this.score = 0;
    })
    .methods({
        dead: function() {
            return this.radius < 1;
        },

        die: function() {
            this.radius = 0;
        },

        compare: function(size) {
            var radius = this.radius;
            size = size || {};

            if (size.min && radius < size.min) {
                return -1;
            }

            if (size.max && radius > size.max) {
                return 1;
            }

            return 0;
        }
    });

    var Splitter = Blob.extend(function() {
        this.init();
        this.rotation = 0;
        this.radius = 10;
    }).methods({
        draw: function(ctx) {
            var pi = Math.PI;
            var rotation = this.rotation + pi / 180;
            this.rotation = rotation;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, rotation, rotation + pi, true);
            ctx.closePath();
            ctx.fillStyle = "#00ee00";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#003300';
            ctx.stroke();
        },

        init: function() {
            this.x = random() * width;
            this.y = random() * height - height;
        },

        interact: function(player) {
            if (this.overlap(player)) {
                player.radius /= 2;
                this.init();
            }
        }
    });

    var game = (function() {
        function sizeTick(game) {
            var player = game.player;
            var compare = player.compare(this.endSize);
            var messages = game.messages;

            if (this.compare === compare) {
                return;
            }

            this.compare = compare;

            player.color = compare < 0 ? "#aaf" :
                           compare > 0 ? "#faa" :
                           "#ccc";

            var endsIn = +new Date;

            if (messages.length) {
                // get when last message ends
                endsIn = messages[messages.length - 1].endsIn;
            }

            var message = { endsIn: endsIn + 3000, opacity: 1 };

            if (compare < 0) {
                message.title = "Get bigger!";
                message.message = "Consume blue blobs";
            } else if (compare > 0) {
                message.title = "Get smaller!";
                message.message = "Split yourself or brush off red blobs";
            } else {
                message.title = "You're in good shape";
                message.message = "Finish the level in that size";
            }

            messages.push(message);
        }

        var levelLength = 16 * height;

        var levels = [
            {
                title: "Learning the ropes",
                enemies: 30,
                powerups: 1,
                endSize: {
                    min: 50,
                    max: 100
                }
            },
            {
                title: "Missing the gap is lethal",
                enemies: 30,
                tunnels: 1,
                powerups: 1
            },
            {
                title: "Don't catch your breath",
                enemies: 30,
                tunnels: 1,
                powerups: 1,
                setup: function(game) {
                    this.endTime = +new Date + 1000 * 20; // 10s time limit

                    game.messages.push({
                        title: "",
                        message: "",
                        endsIn: this.endTime,
                        opacity: 1
                    });
                },
                tick: function(game) {
                    var now = +new Date;
                    var timeRemaining = (this.endTime - now) / 1000;
                    var messages = game.messages;
                    var message = messages[messages.length - 1];

                    if (!message || timeRemaining < 0) {
                        game.lose();
                    } else {
                        message.title = timeRemaining.toFixed(1) + "s";
                    }
                }
            },
            {
                title: "Don't get lost in the crowd",
                enemies: { count: 70, minSize: 30 },
                powerups: 1
            },
            {
                title: "Don't undermine your achievements",
                powerups: 20,
                setup: function(game) {
                    game.player.radius = 100;
                }
            },
            {
                title: "Epilogue",
                enemies: 1,
                setup: function(game) {
                    var lastEnemy = game.enemies[0];
                    lastEnemy.x = width / 2;
                    lastEnemy.y = -levelLength - height / 2;
                    lastEnemy.radius = width;
                }
            }
        ];

        var gameObjects = {
            enemies: { type: Blob },
            tunnels: { type: Tunnel },
            powerups: { type: Splitter }
        };

        return {
            messages: [],

            init: function(canvas) {
                this.hudWidth = 10;

                // setup canvas element
                canvas.width = width + this.hudWidth;
                canvas.height = height;
                canvas.style.margin = "-" + height/2 + "px 0 0 -" + width/2 + "px";

                this.currentLevel = 0;

                this.ctx = canvas.getContext("2d");

                this.backgroundPattern = this.ctx.createPattern(bg, "repeat");

                game.start();

                requestAnimationFrame(function step(timestamp) {
                    game.tick();
                    requestAnimationFrame(step);
                });

                this.worldProgress = 0;
            },

            start: function() {
                var currentLevel = this.currentLevel % levels.length;
                var level = levels[currentLevel];

                this.messages.length = 0;

                this.minSpeed = 2;

                if (level.endSize && !level.tick) {
                    level.tick = sizeTick;
                }

                this.player = new Player();

                for (var field in gameObjects) {
                    var array = [];
                    var objectInfo = gameObjects[field];
                    var count = level[field] && level[field].count || level[field] || 0;
                    for (var i = 0; i < count; i++) {
                        array.push(new objectInfo.type());
                    }
                    this[field] = array;
                }

                for (var i = 0; i < levels[currentLevel].tunnels || 0; i++) {
                    this.tunnels[i].afterInit(this);
                }

                this.messages.push({
                    title: "Level " + (currentLevel + 1),
                    message: levels[currentLevel].title,
                    endsIn: +(new Date()) + 4000,
                    opacity: 1
                });

                this.speed = 30;

                if (level.setup) {
                    level.setup(this);
                }
            },

            tick: function() {
                var ctx = this.ctx;
                var now = +(new Date());
                var player = this.player;
                var progress = player.progress / levelLength;
                var level = levels[this.currentLevel];

                this.speed += constrain(this.minSpeed - this.speed, -1, 1);

                this.worldProgress += this.speed;

                this.background(ctx);

                if (!player.dead()) {
                    this.queuedMessage(ctx, now);
                }

                player.x = constrain(player.x + player.speed || 0, player.radius, width - player.radius);

                this.updateObjects(ctx, progress);

                if (level && level.tick) {
                    level.tick(this);
                }

                this.score(ctx);

                if (this.won()) {
                    this.showMessage("You kinda won...", "Better luck next time!");
                } else if (!player.dead()) {
                    player.draw(ctx);

                    player.progress += this.speed;
                } else  {
                    this.showMessage("Level failed", "Press <Space> to retry");
                }

                this.progress(ctx, progress);

                this.goal(ctx);

                if (!this.won() && player.progress > levelLength) {
                    // end of level reached, check if end size criteria is met
                    var compare = player.compare(level.endSize);
                    if (compare === 0) {
                        this.nextLevel();
                    } else {
                        this.lose();
                    }
                }
            },

            background: function(ctx) {
                ctx.fillStyle = this.backgroundPattern;
                ctx.translate(0, this.worldProgress % 38);
                ctx.fillRect(0, -38, width, height + 38);
                ctx.translate(0, -this.worldProgress % 38);
            },

            queuedMessage: function(ctx, now) {
                var message = this.messages[0];
                if (!message) {
                    return;
                }

                if (message.endsIn > now || message.opacity > 0) {
                    this.showMessage(message.title, message.message, message.opacity);
                    if (message.endsIn < now) {
                        message.opacity -= 0.05;
                    }
                } else {
                    this.messages.shift();
                }
            },

            updateObjects: function(ctx, progress) {
                var player = this.player;
                var speed = this.speed;

                for (var field in gameObjects) {
                    var array = this[field];
                    for (var i = 0, len = array.length; i < len; i++) {
                        var obj = array[i];

                        obj.y += speed;

                        obj.interact(player);

                        if (progress < 1 && obj.top() > height) {
                            obj.init();
                        }

                        obj.draw(ctx);
                    }

                    if (player.dead()) {
                        this.lose();
                    }
                }

                var tunnels = this.tunnels;
                for (var i = 0; i < tunnels.length; i++) {
                    tunnels[i].afterInit(this);
                }
            },

            goal: function(ctx) {
                var player = this.player;
                var goalPosition = levelLength - this.worldProgress;

                if (goalPosition < height) {
                    ctx.beginPath();
                    ctx.moveTo(0, player.y - goalPosition);
                    ctx.lineTo(width, player.y - goalPosition);
                    ctx.lineTo(width, player.y - goalPosition + 10);
                    ctx.lineTo(0, player.y - goalPosition + 10);
                    ctx.closePath();
                    ctx.fillStyle = "#fff";
                    ctx.fill();
                }
            },

            score: function(ctx) {
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,1)";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 5;
                ctx.textAlign = "right";

                ctx.font = "16pt Arial";
                ctx.fillStyle = "#f1f1f1";
                ctx.fillText("Level score: " + this.player.score, width - 10, 30);

                ctx.restore();
            },

            progress: function(ctx, amountDone) {
                var hudWidth = this.hudWidth;

                ctx.fillStyle = "#111";
                ctx.fillRect(width, 0, hudWidth, height);

                var indicatorHeight = height * amountDone;

                ctx.fillStyle = "#2c7fff";
                ctx.fillRect(width, height - indicatorHeight, hudWidth, indicatorHeight);
            },

            accelerate: function() {
                this.minSpeed = 10;
            },

            decelerate: function() {
                this.minSpeed = 1;
            },

            normalize: function() {
                this.minSpeed = 2;
            },

            showMessage: function (title, message, opacity) {
                var ctx = this.ctx;

                opacity = opacity || 1;

                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,1)";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 5;
                ctx.textAlign = "center";

                var textColor = "rgba(257,257,257," + opacity + ")";

                ctx.font = "24pt Arial";
                ctx.fillStyle = textColor;
                ctx.fillText(title, width/2, height/2);

                ctx.font = "16pt Arial";
                ctx.fillStyle = textColor;
                ctx.fillText(message, width/2, height/2 + 30);

                ctx.restore();
            },

            renderStatus: function(message) {
                var ctx = this.ctx;

                ctx.font = "16pt Arial";
                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.fillText(message, width/2, height/2);
            },

            nextLevel: function() {
                this.currentLevel++;

                if (this.currentLevel < levels.length) {
                    this.start();
                } else {
                    this.win();
                }
            },

            won: function() {
                return !levels[this.currentLevel];
            },

            win: function() {
                this.normalize();
            },

            lose: function() {
                this.player.die();

                this.normalize();
            }
        };
    })();

    function on(type, handler) {
        document.body.addEventListener(type, handler, false);
    }

    var UP = 38, DOWN = 40, LEFT = 37, RIGHT = 39, SPACE = 32;
    var A = 65, S = 83, D = 68, W = 87;

    on("keydown", function(e) {
        var key = e.keyCode;
        var player = game.player;

        if (!player.dead() && !game.won()) {
            if (key == RIGHT || key == D) {
                player.speed = 4;
            } else if (key == LEFT || key == A) {
                player.speed = -4;
            } else if (key == UP || key == W) {
                game.accelerate();
            } else if (key == DOWN || key == S) {
                game.decelerate();
            }
        } else {
            if (key == SPACE) {
                if (game.won()) {
                    game.currentLevel = 0;
                }

                game.start();
            }
        }
    });

    on("keyup", function(e) {
        var key = e.keyCode;
        if (key == UP || key == DOWN || key == W || key == S) {
            game.normalize();
        } else if (key == LEFT || key == RIGHT || key == A || key == D) {
            game.player.speed = 0;
        }
    });

    w.game = game;
})();

