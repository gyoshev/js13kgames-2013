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
            } else if (!player.dead && !this.passed && this.top() > player.y + player.radius) {
                this.passed = true;
                player.tunnelsPassed += 1;
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
        this.tunnelsPassed = 0;
        this.dead = false;
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
        var state = "";

        var currentLevel = 0;

        var levels = [
            {
                title: "Don't overeat",
                enemies: 30,
                powerups: 1
            },
            {
                title: "Don't miss the tunnels",
                enemies: 30,
                tunnels: 1,
                powerups: 1
            },
            {
                title: "Don't catch your breath",
                enemies: 30,
                tunnels: 1,
                powerups: 1,
                setup: function() {
                    this.endTime = +new Date + 1000 * 30; // 30s level
                    this.startTime = +new Date;
                    this.goalAt = 1000; // px
                    this.travelled = 0;
                },
                tick: function() {
                    var timeRemaining = (this.endTime - this.startTime) / 1000;

                    if (timeRemaining < 0) {
                        this.renderMessage(
                            "Distance: " + this.travelled + " / " + this.goalAt + ", " +
                            "time: 0s"
                        );

                        this.lose();
                    } else {
                        this.renderMessage(
                            "Distance: " + this.travelled + " / " + this.goalAt + ", " +
                            "time: " + timeRemaining + "s"
                        );
                    }
                }
            },
            {
                title: "Don't get lost in the crowd",
                enemies: { count: 70, minSize: 20 },
                powerups: 1
            },
            {
                title: "Don't undermine your achievements",
                powerups: 20,
                init: function() {
                    this.player.radius = 100;
                }
            }
        ];

        var gameObjects = {
            enemies: { type: Blob },
            tunnels: { type: Tunnel },
            powerups: { type: Splitter }
        };

        return {
            running: function() {
                return state == "running";
            },

            init: function(canvas) {
                this.hudWidth = 10;

                // setup canvas element
                canvas.width = width + this.hudWidth;
                canvas.height = height;
                canvas.style.margin = "-" + height/2 + "px 0 0 -" + width/2 + "px";

                this.ctx = canvas.getContext("2d");

                game.start();

                requestAnimationFrame(function step(timestamp) {
                    game.tick();
                    requestAnimationFrame(step);
                });
            },

            start: function() {
                state = "running";

                this.minSpeed = 2;

                this.player = new Player();

                for (var field in gameObjects) {
                    var array = [];
                    var objectInfo = gameObjects[field];
                    var level = levels[currentLevel];
                    var count = level[field] && level[field].count || level[field] || 0;
                    for (var i = 0; i < count; i++) {
                        array.push(new objectInfo.type());
                    }
                    this[field] = array;
                }

                for (var i = 0; i < levels[currentLevel].tunnels || 0; i++) {
                    this.tunnels[i].afterInit(game);
                }

                this.statusMessage = {
                    title: "Level " + (currentLevel + 1),
                    message: levels[currentLevel].title,
                    endsIn: +(new Date()) + 2000, // 3s display time
                    opacity: 1
                };

                this.y = 0;

                this.speed = 30;
            },

            tick: function() {
                var ctx = this.ctx;
                var now = +(new Date());
                ctx.clearRect(0,0,width,height);

                var status = this.statusMessage;
                if (game.running() && (status.endsIn > now || status.opacity > 0)) {
                    this.showMessage(status.title, status.message, status.opacity);
                    if (status.endsIn < now) {
                        status.opacity -= 0.05;
                    }
                }

                var player = this.player;

                if (this.speed > this.minSpeed) {
                    this.speed -= 1;
                } else if (this.speed < this.minSpeed) {
                    this.speed += 1;
                }

                this.y += this.speed;

                player.x = constrain(player.x + player.speed || 0, player.radius, width - player.radius);

                for (var field in gameObjects) {
                    var array = this[field];
                    for (var i = 0, len = array.length; i < len; i++) {
                        var obj = array[i];

                        obj.y += this.speed;

                        obj.interact(player);

                        if (obj.top() > height) {
                            obj.init();
                        }

                        obj.draw(ctx);
                    }

                    if (player.radius < 1 || player.radius > Math.max(width, height)) {
                        this.lose();
                    }
                }

                var tunnels = this.tunnels;
                for (var i = 0; i < tunnels.length; i++) {
                    tunnels[i].afterInit(game);
                }

                player.draw(ctx);

                if (!this.running()) {
                    this.showMessage("Game over", "Press <Space> to play again");
                }

                this.score(ctx);

                var progress = this.y / (20 * height);

                this.progress(ctx, progress);
            },

            score: function(ctx) {
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,1)";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 5;
                ctx.textAlign = "right";

                var tunnelsPassed = this.player.tunnelsPassed;

                if (tunnelsPassed) {
                    ctx.font = "16pt Arial";
                    ctx.fillStyle = "#f1f1f1";
                    ctx.fillText("Tunnels passed: " + tunnelsPassed, width - 10, 30);
                }

                ctx.restore();
            },

            progress: function(ctx, amountDone) {
                var hudWidth = this.hudWidth;

                ctx.fillStyle = "#111";
                ctx.fillRect(width, 0, hudWidth, height);

                var indicatorHeight = height * amountDone;

                ctx.fillStyle = "#82c0cf";
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

            win: function() {
                state = "over:won";

                currentLevel++;

                this.normalize();
            },

            lose: function() {
                state = "over:lost";

                this.player.dead = true;

                this.normalize();
            }
        };
    })();

    function on(type, handler) {
        document.body.addEventListener(type, handler, false);
    }

    var UP = 38, DOWN = 40, LEFT = 37, RIGHT = 39, SPACE = 32;

    on("keydown", function(e) {
        var key = e.keyCode;
        var player = game.player;

        if (game.running()) {
            if (key == RIGHT) {
                player.speed = 4;
            } else if (key == LEFT) {
                player.speed = -4;
            } else if (key == UP) {
                game.accelerate();
            } else if (key == DOWN) {
                game.decelerate();
            }
        } else {
            if (key == SPACE) {
                game.start();
            }
        }

    });

    on("keyup", function(e) {
        var key = e.keyCode;
        if (key == UP || key == DOWN) {
            game.normalize();
        } else if (key == LEFT || key == RIGHT) {
            game.player.speed = 0;
        }
    });

    w.game = game;
})();

