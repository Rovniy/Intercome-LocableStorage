(function () {
    if (Intercom.supported) {
        let intercom = Intercom.getInstance(), //Intercom singleton
            period_heart_bit = 1, //LocalStorage update frequency
            wsId = someNumber() + Date.now(), //Current tab ID
            primaryStatus = false, //Primary window tab status
            refreshIntervalId,
            count = 0, //Counter. Delete this
            intFast; //Timer

        window.webSocketInit = webSocketInit;
        window.semiCloseTab = semiCloseTab;


        intercom.on('incoming', data => {
            document.getElementById('counter').innerHTML = data.data;
            document.getElementById('socketStatus').innerHTML = primaryStatus.toString();
            return false;
        });

        /**
         * Random number
         * @returns {number} - number
         */
        function someNumber() {
            return Math.random() * 1000000000 | 0;
        }

        /**
         * Try do something
         */
        function webSocketInit() {
            // Check for crash or loss network
            let forceOpen = false,
                wsLU = localStorage.wsLU;

            if (wsLU) {
                let diff = Date.now() - parseInt(wsLU);
                forceOpen = diff > period_heart_bit * 5 * 1000;
            }

            //Double checked locking
            if (!localStorage.wsOpen || localStorage.wsOpen !== "true" || forceOpen) {

                LockableStorage.trySyncLock("wsOpen", function () {
                    if (!localStorage.wsOpen || localStorage.wsOpen !== "true" || forceOpen) {
                        localStorage.wsOpen = true;
                        localStorage.wsId = wsId;
                        localStorage.wsLU = Date.now();


                        //TODO this app logic that must be SingleTab ----------------------------
                        primaryStatus = true;
                        intFast = setInterval(() => {
                            intercom.emit('incoming', {data: count});
                            count++
                        }, 1000);
                        //TODO ------------------------------------------------------------------

                        startHeartBitInterval();
                    }
                });
            }
        }

        /**
         * Show singleTab app status
         */
        setInterval(() => {
            document.getElementById('wsopen').innerHTML = localStorage.wsOpen;
        }, 200);


        /**
         * Update localStorage info
         */
        function startHeartBitInterval() {
            refreshIntervalId = setInterval(function () {
                localStorage.wsLU = Date.now();
            }, period_heart_bit * 1000);
        }

        /**
         * Close tab action
         */
        intercom.on('TAB_CLOSED', function (data) {
            if (localStorage.wsId !== wsId) {
                count = data.count;
                setTimeout(() => {
                    webSocketInit()
                }, parseInt(getRandomArbitary(1, 1000), 10)); //Init after random time. Important!
            }
        });

        function getRandomArbitary(min, max) {
            return Math.random() * (max - min) + min;
        }

        /**
         * Action after some tab closed
         */
        window.onbeforeunload = function () {
            if (primaryStatus) {
                localStorage.setItem('wsOpen', false);
                clearInterval(refreshIntervalId);
                intercom.emit('TAB_CLOSED', {count: count});
            }
        };

        /**
         * Emulate close window
         */
        function semiCloseTab() {
            if (primaryStatus) {
                localStorage.setItem('wsOpen', false);
                clearInterval(refreshIntervalId);
                clearInterval(intFast);
                intercom.emit('TAB_CLOSED', {count: count});
            }
        }

        webSocketInit() //Try do something


    } else {
        alert('intercom.js is not supported by your browser.');
    }
})();