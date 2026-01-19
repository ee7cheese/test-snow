jQuery(async () => {
    const BTN_ID = 'st-native-snow-btn';
    let isSnowing = false;
    let timer = null;

    function init() {
        if ($(`#${BTN_ID}`).length) return;
        const btn = $(`<div id="${BTN_ID}">❄</div>`);
        $('body').append(btn);

        btn.on('click', function() {
            isSnowing = !isSnowing;
            if (isSnowing) {
                $(this).addClass('active');
                startSnow();
            } else {
                $(this).removeClass('active');
                stopSnow();
            }
        });
        console.log('悬浮飘雪插件已加载');
    }

    function startSnow() {
        spawn(20);
        timer = setInterval(() => { if(isSnowing) spawn(5); }, 500);
    }

    function stopSnow() {
        clearInterval(timer);
        $('.st-native-flake').remove();
    }

    function spawn(n) {
        for(let i=0; i<n; i++) {
            const f = $('<div class="st-native-flake">❄</div>');
            f.css({
                left: Math.random() * 100 + 'vw',
                animationDuration: (Math.random() * 3 + 4) + 's',
                fontSize: (Math.random() * 15 + 10) + 'px',
                opacity: Math.random() * 0.6 + 0.4
            });
            f.on('animationend', function() { $(this).remove(); });
            $('body').append(f);
        }
    }
    setTimeout(init, 2000);
});