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
            var id = w.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    var width = 600;
    var height = 800;

    function centerDistance(other) {
        return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }

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

    function Tunnel() {
        this.width = 90;
        this.height = 20;
        this.gateRadius = new Blob();
        this.init();
    };

    Tunnel.prototype = {
        // minimum offset from edges
        offset: 50,

        init: function() {
            this.y = random() * height - height;
            this.start = constrain(random() * width, this.offset, width - this.offset - this.width);
            this.end = this.start + this.width;
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

            ctx.fillStyle = "#aaa";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#003300';
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
    };

    function Blob() {
        this.init();
    };

    Blob.prototype = {
        init: function() {
            this.radius = Math.max(5, random() * 30);
            this.x = random() * width;
            this.y = random() * height - height;
        },

        draw: function(ctx) {
            var radius = this.radius;

            if (radius == 0) {
                return;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#003300';
            ctx.stroke();
        },

        centerDistance: centerDistance,

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
                this.color = "#ffaaaa";
            } else {
                this.color = "#aaaaff";
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
    };

    function Player() {
        this.radius = 10;
        this.x = width / 2;
        this.y = height * 7/8;
        this.color = '#cccccc';
        this.speed = 0;
    }

    Player.prototype = {
        draw: Blob.prototype.draw
    };

    function Splitter() {
        this.init();
    }

    Splitter.prototype = {
        draw: function(ctx) {
            var x = this.x;
            var y = this.y;

            ctx.beginPath();
            ctx.moveTo(x-5, y);
            ctx.lineTo(x,y+10);
            ctx.lineTo(x+5, y);
            ctx.lineTo(x, y-10);
            ctx.closePath();
            ctx.fillStyle = "#00ee00";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#003300';
            ctx.stroke();
        },

        top: function() {
            return this.y - 10;
        },

        init: function() {
            this.x = random() * width;
            this.y = random() * height - height;
        },

        centerDistance: centerDistance,

        interact: function(player) {
            var overlap = this.centerDistance(player) < player.radius;

            if (overlap) {
                player.radius /= 2;
                this.init();
            }
        }
    }

    var game = (function() {
        var state = "";
        var gameObjects = {
            enemies: { type: Blob, count: 60 },
            tunnels: { type: Tunnel, count: 1 },
            powerups: { type: Splitter, count: 4 }
        };

        return {
            running: function() {
                return state == "running";
            },

            init: function(canvas) {
                // setup canvas element
                canvas.width = width;
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
                    for (var i = 0; i < objectInfo.count; i++) {
                        array.push(new objectInfo.type());
                    }
                    this[field] = array;
                }

                for (var i = 0; i < gameObjects["tunnels"].count; i++) {
                    this.tunnels[i].afterInit(game);
                }

                this.speed = 30;
            },

            tick: function() {
                var ctx = this.ctx;
                ctx.clearRect(0,0,width,height);

                var player = this.player;

                if (this.speed > this.minSpeed) {
                    this.speed -= 1;
                } else if (this.speed < this.minSpeed) {
                    this.speed += 1;
                }

                player.x = constrain(player.x + player.speed || 0, player.radius, width - player.radius);

                for (var field in gameObjects) {
                    var array = this[field];
                    for (var i = 0; i < array.length; i++) {
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

                for (var i = 0; i < this.tunnels.length; i++) {
                    this.tunnels[i].afterInit(game);
                }

                player.draw(ctx);

                if (!this.running()) {
                    this.showMessage("Game over", "Press <Space> to play again");
                }
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

            showMessage: function (title, message) {
                var ctx = this.ctx;

                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,1)";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 5;
                ctx.textAlign = "center";

                ctx.font = "24pt Arial";
                ctx.fillStyle = "#f1f1f1";
                ctx.fillText(title, width/2, height/2);

                ctx.font = "16pt Arial";
                ctx.fillStyle = "#f1f1f1";
                ctx.fillText(message, width/2, height/2 + 30);

                ctx.restore();
            },

            lose: function() {
                state = "over:lost";

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

    window.game = game;
})();

