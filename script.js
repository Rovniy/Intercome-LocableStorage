(function () {
    let intercom = Intercom.getInstance(), //Инстанс интеркома
        period_heart_bit = 10, //Задержка перед разрывом вкладок
        wsId = someNumber() + Date.now(), //ID соединения
        socket = false, //Статус открытия сокета
        refreshIntervalId, //Таймер обновления времени в localStorage
        count = 0, //TODO это счетчик, его удалить
        intFast; //TODO функция тестового таймера. Заменить на вызов соединения к WS

    /**
     * TODO здесь должно быть подключение к сокетам
     */
    function startCount() {
        clearInterval(intFast);
        intFast = setInterval(() => {
            intercom.emit('incoming', {data: count});
            count++
        }, 1000);
    }

    /**
     * Событие получения сообщения из интеркома. Именно так должно быть органищзовано общение внутри всего проекта. $intercome должен быть Vue.prototype.$intercome
     */
    intercom.on('incoming', data => {
        console.log('count', data)
        document.getElementById('counter').innerHTML = data.data;
    });

    /**
     * Просто рандомное число, чтобы в 99,9999999% всегда было разным
     * @returns {number}
     */
    function someNumber() {
        return Math.random() * 1000000000 | 0;
    }

    /**
     * Обработчик проверки MAIN вкладки и событие, если вкладка is MAIN
     */
    function webSocketInit() {
        // если случился креш и сокет остался открыт, проверка на ласт-апдейт;
        let forceOpen = false;
        let wsLU = localStorage.wsLU;

        if (wsLU) {
            let diff = Date.now() - parseInt(wsLU);
            forceOpen = diff > period_heart_bit * 5 * 1000;
        }

        //double checked locking
        if (!localStorage.wsOpen || localStorage.wsOpen !== "true" || forceOpen) {
            //https://github.com/elad/LockableStorage/blob/master/LockableStorage.js#L139
            LockableStorage.trySyncLock("wsOpen", function () {
                if (!localStorage.wsOpen || localStorage.wsOpen !== "true" || forceOpen) {
                    localStorage.wsOpen = true;
                    localStorage.wsId = wsId;
                    localStorage.wsLU = Date.now();


                    //--------------------
                    //Вот тут должны быть логика поднятия вебсокета и обработка всех событий по сокетам
                    socket = true;
                    startCount();


                    //----------------------

                    startHeartBitInterval();
                }
            });
        }
    }

    /**
     * Таймер активной вкладки
     */
    function startHeartBitInterval() {
        refreshIntervalId = setInterval(function () {
            localStorage.wsLU = Date.now();
        }, period_heart_bit * 1000);
    }

    /**
     * Событие, если закрылась активная вкладка и сокет должен был закрыться
     */
    intercom.on('pass_socket', function (data) {
        if (localStorage.wsId !== wsId) {
            count = data.count;
            setTimeout(webSocketInit(), parseInt(getRandomArbitary(1, 1000), 10)); //Инициализация через рандомное время. Обязательна! чтобы измежать накладок с асинхроном
        } else {
            // socket = undefined;
            //Отработка этого события во вторичной вкладке
        }
    });

    /**
     * Получение рандомного числа в разных интервалах
     * @param min
     * @param max
     * @returns {*}
     */
    function getRandomArbitary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Отработка события закрытия вкладки
     */
    window.addEventListener('beforeunload', function () {
        if (socket) {
            localStorage.wsOpen = false;
            clearInterval(refreshIntervalId);
            intercom.emit('pass_socket', {count: count});
        }
    });

    /**
     * Проверка на поддержку WS браузером
     * @return {boolean}
     */
    function isWebSocketSupported() {
        let supports = false;

        try {
            supports = 'WebSocket' in window && window.WebSocket.CLOSING === 2;
            if (supports) webSocketInit()
        } catch (e) {
        }

        return supports;
    }

    isWebSocketSupported()//Обработчик проверки MAIN вкладки и событие, если вкладка is MAIN


})();