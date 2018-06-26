(function () {

    function now() {
        return new Date().getTime();
    }

    function someNumber() {
        return Math.random() * 1000000000 | 0;
    }

    let myId = now() + ":" + someNumber();

    function getter(lskey) {
        return function () {
            let value = localStorage[lskey];
            if (!value)
                return null;

            let splitted = value.split(/\|/);
            if (parseInt(splitted[1]) < now()) {
                return null;
            }
            return splitted[0];
        }
    }

    function _mutexTransaction(key, callback, synchronous) {
        let xKey = key + "__MUTEX_x",
            yKey = key + "__MUTEX_y",
            getY = getter(yKey);

        function criticalSection() {
            try {
                callback();
            } finally {
                localStorage.removeItem(yKey);
            }
        }

        localStorage[xKey] = myId;
        if (getY()) {
            if (!synchronous)
                setTimeout(function () {
                    _mutexTransaction(key, callback);
                }, 0);
            return false;
        }
        localStorage[yKey] = myId + "|" + (now() + 40);

        if (localStorage[xKey] !== myId) {
            if (!synchronous) {
                setTimeout(function () {
                    if (getY() !== myId) {
                        setTimeout(function () {
                            _mutexTransaction(key, callback);
                        }, 0);
                    } else {
                        criticalSection();
                    }
                }, 50)
            }
            return false;
        } else {
            criticalSection();
            return true;
        }
    }

    function lockImpl(key, callback, maxDuration, synchronous) {

        maxDuration = maxDuration || 5000;

        let mutexKey = key + "__MUTEX",
            getMutex = getter(mutexKey),
            mutexValue = myId + ":" + someNumber() + "|" + (now() + maxDuration);

        function restart() {
            setTimeout(function () {
                lockImpl(key, callback, maxDuration);
            }, 10);
        }

        if (getMutex()) {
            if (!synchronous)
                restart();
            return false;
        }

        let aquiredSynchronously = _mutexTransaction(key, function () {
            if (getMutex()) {
                if (!synchronous)
                    restart();
                return false;
            }
            localStorage[mutexKey] = mutexValue;
            if (!synchronous)
                setTimeout(mutexAquired, 0)
        }, synchronous);

        if (synchronous && aquiredSynchronously) {
            mutexAquired();
            return true;
        }
        return false;

        function mutexAquired() {
            try {
                callback();
            } finally {
                _mutexTransaction(key, function () {
                    if (localStorage[mutexKey] !== mutexValue)
                        throw key + " was locked by a different process while I held the lock"

                    localStorage.removeItem(mutexKey);
                });
            }
        }

    }

    window.LockableStorage = {
        lock: function (key, callback, maxDuration) {
            lockImpl(key, callback, maxDuration, false)
        },
        trySyncLock: function (key, callback, maxDuration) {
            return lockImpl(key, callback, maxDuration, true)
        }
    };
})();