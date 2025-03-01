class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio');
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.cover = document.getElementById('cover');
        this.songName = document.querySelector('.song-name');
        this.artistName = document.querySelector('.artist-name');
        this.progress = document.querySelector('.progress');
        this.currentTime = document.querySelector('.current-time');
        this.totalTime = document.querySelector('.total-time');
        
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        
        this.updateDate();
        this.initEvents();
        this.loadPlaylist();
        
        // 添加触摸相关的属性
        this.card = document.querySelector('.card');
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50; // 最小滑动距离
        this.isAnimating = false;
        
        // 添加触摸事件监听
        this.initTouchEvents();
        
        this.hitokotoText = document.querySelector('.hitokoto-text');
        this.hitokotoFrom = document.querySelector('.hitokoto-from');
        
        // 添加滑动检测相关属性
        this.isSwiping = false;
        this.touchMoveCount = 0;
        
        // 初始加载诗词并启动自动刷新
        this.loadJinrishici();
        this.startJinrishiciAutoRefresh();
        
        this.autoplayAfterLoad = false; // 添加标记，控制是否需要自动播放
    }
    
    updateDate() {
        const date = new Date();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dateInfo = document.querySelector('.date-info');
        dateInfo.textContent = `${month}/${day}`;
    }
    
    async loadPlaylist() {
        try {
            const response = await fetch('https://api.qijieya.cn/meting/?type=playlist&id=5453912201');
            const data = await response.json();
            this.playlist = data.map(song => ({
                name: song.name,
                artist: song.artist,
                url: song.url.replace(/^https?:\/\/[^/]+/, 'https://api.qijieya.cn'),
                pic: song.pic.replace(/^https?:\/\/[^/]+/, 'https://api.qijieya.cn'),
                lrc: song.lrc.replace(/^https?:\/\/[^/]+/, 'https://api.qijieya.cn')
            }));
            this.loadSong();
            this.updatePlaylistInfo();
            
            // 加载完第一首歌后更新时间显示
            this.audio.addEventListener('loadedmetadata', () => {
                this.updateProgress();
            }, { once: true });
        } catch (error) {
            console.error('加载播放列表失败:', error);
        }
    }
    
    updatePlaylistInfo() {
        const timeInfo = document.querySelector('.time-info');
        timeInfo.textContent = `${this.currentIndex + 1}/${this.playlist.length}`;
    }
    
    loadSong() {
        const song = this.playlist[this.currentIndex];
        if (!song) return;
        
        this.audio.src = song.url;
        this.cover.src = song.pic;
        this.songName.textContent = song.name;
        this.artistName.textContent = song.artist;
        
        // 预加载音频
        this.audio.load();
        
        if (this.autoplayAfterLoad) {
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
            }).catch(error => {
                console.error('播放失败:', error);
                this.isPlaying = false;
                this.playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            });
        }
    }
    
    initEvents() {
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.prevSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.nextSong());
    }
    
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
                this.autoplayAfterLoad = true; 
            }).catch(error => {
                console.error('播放失败:', error);
                this.isPlaying = false;
                this.autoplayAfterLoad = false;
            });
        } else {
            this.audio.pause();
            this.isPlaying = false;
            this.playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        }
    }
    
    prevSong() {
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadSong();
        this.updatePlaylistInfo();
    }
    
    nextSong() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadSong();
        this.updatePlaylistInfo();
    }
    
    updateProgress() {
        const { currentTime, duration } = this.audio;
        const progressPercent = (currentTime / duration) * 100;
        this.progress.style.width = `${progressPercent}%`;
        
        this.currentTime.textContent = this.formatTime(currentTime);
        this.totalTime.textContent = this.formatTime(duration);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    initTouchEvents() {
        this.card.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.card.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.card.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    handleTouchStart(e) {
        if (this.isAnimating) return;
        this.touchStartX = e.touches[0].clientX;
        this.touchMoveCount = 0;
        this.isSwiping = false;
        this.card.style.transition = 'none';
    }
    
    handleTouchMove(e) {
        if (this.isAnimating) return;
        this.touchEndX = e.touches[0].clientX;
        const diffX = this.touchEndX - this.touchStartX;
        this.touchMoveCount++;
        
        // 如果移动次数超过阈值且移动距离足够，则认为是滑动
        if (this.touchMoveCount > 3 && Math.abs(diffX) > 10) {
            this.isSwiping = true;
        }
        
        // 确保滑动切歌
        if (this.isSwiping && Math.abs(diffX) < window.innerWidth / 2) {
            this.card.style.transform = `translateX(${diffX}px)`;
        }
    }
    
    handleTouchEnd(e) {
        if (this.isAnimating || !this.isSwiping) {
            this.resetCardPosition();
            return;
        }
        
        const diffX = this.touchEndX - this.touchStartX;
        
        if (Math.abs(diffX) > this.minSwipeDistance) {
            if (diffX > 0) {
                this.slideToDirection('right');
            } else {
                this.slideToDirection('left');
            }
        } else {
            this.resetCardPosition();
        }
    }
    
    slideToDirection(direction) {
        this.isAnimating = true;
        const targetX = direction === 'right' ? window.innerWidth : -window.innerWidth;
        
        this.card.style.transition = 'transform 0.3s ease-out';
        this.card.style.transform = `translateX(${targetX}px)`;
        
        setTimeout(() => {
            if (direction === 'right') {
                this.prevSong();
            } else {
                this.nextSong();
            }
            
            this.card.style.transition = 'none';
            this.card.style.transform = `translateX(${-targetX}px)`;
            
            requestAnimationFrame(() => {
                this.card.style.transition = 'transform 0.3s ease-out';
                this.card.style.transform = 'translateX(0)';
                
                setTimeout(() => {
                    this.isAnimating = false;
                }, 300);
            });
        }, 300);
    }
    
    resetCardPosition() {
        this.card.style.transition = 'transform 0.3s ease-out';
        this.card.style.transform = 'translateX(0)';
    }
    
    async loadJinrishici() {
        try {
            const response = await fetch('https://v2.jinrishici.com/one.json');
            const data = await response.json();
            if (data.status === "success") {
                // 添加淡出效果
                this.hitokotoText.style.opacity = '0';
                this.hitokotoFrom.style.opacity = '0';
                
                setTimeout(() => {
                    this.hitokotoText.textContent = data.data.content;
                    this.hitokotoFrom.textContent = `——${data.data.origin.dynasty} · ${data.data.origin.author}`;
                   
                    this.hitokotoText.style.opacity = '1';
                    this.hitokotoFrom.style.opacity = '1';
                }, 500); // 等待淡出完成后更新内容
            }
        } catch (error) {
            console.error('加载失败:', error);
        }
    }
    
    startJinrishiciAutoRefresh() {
        setInterval(() => {
            this.loadJinrishici();
        }, 5000); // 5秒刷新歌词
    }
}

// 添加错误处理
window.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // 添加音频错误处理
    player.audio.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
        player.nextSong(); // 当前歌曲加载失败，自动切换下一首
    });
});  