const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');

// --- 24時間稼働させるためのWebサーバー設定 ---
const app = express();
app.get('/', (req, res) => res.send('Botは元気に起きています！'));
app.listen(process.env.PORT || 3000, () => console.log('Webサーバー起動完了'));

// --- Discord Botの設定 ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// 入室時間を記録するメモ帳
const userJoinTimes = new Map();

client.on('ready', () => {
    console.log(`${client.user.tag} がログインしました！準備完了です！`);
});

// ↓↓↓これを追加↓↓↓
client.on('debug', (info) => console.log(`[デバッグ] ${info}`));
client.on('error', (err) => console.error(`[重大なエラー]`, err));
// ↑↑↑これを追加↑↑↑

// 誰かがボイスチャンネルを動いた時の処理
client.on('voiceStateUpdate', (oldState, newState) => {
    const channelId = process.env.CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const member = newState.member;
    if (!member) return;

    // 現在の時間をDiscordの「グレーの枠」にするための計算
    const now = Date.now();
    const unixTime = Math.floor(now / 1000);

    // ① 入室した時
    if (!oldState.channelId && newState.channelId) {
        userJoinTimes.set(member.id, now);
        
        // 入室用のデザインを作成
        const joinEmbed = new EmbedBuilder()
            .setColor('#00ff00') // 左側の線の色（緑）
            .setTitle('VCに接続しました')
            .setDescription(`**${member.displayName}**\n<#${newState.channelId}> に参加しました\n\n<t:${unixTime}:F>`)
            .setThumbnail(member.user.displayAvatarURL()); // 右側にアイコンを表示
            
        channel.send({ embeds: [joinEmbed] });
    }

    // ② 退室した時
    if (oldState.channelId && !newState.channelId) {
        const joinTime = userJoinTimes.get(member.id);
        let timeString = '';
        
        if (joinTime) {
            // 通話時間を hh:mm:ss の形式に計算
            const diff = Math.floor((now - joinTime) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            // 1桁の数字を「05」のように2桁にする処理
            const mm = String(m).padStart(2, '0');
            const ss = String(s).padStart(2, '0');
            timeString = `\n通話時間: ${h}:${mm}:${ss}`;
            userJoinTimes.delete(member.id);
        }
        
        // 退室用のデザインを作成
        const leaveEmbed = new EmbedBuilder()
            .setColor('#ff0000') // 左側の線の色（赤）
            .setTitle('VCから切断しました')
            .setDescription(`**${member.displayName}**\n<#${oldState.channelId}> から退出しました\n\n<t:${unixTime}:F>${timeString}`)
            .setThumbnail(member.user.displayAvatarURL());
            
        channel.send({ embeds: [leaveEmbed] });
    }

    // ③ 別のチャンネルへ移動した時
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const joinTime = userJoinTimes.get(member.id);
        let timeString = '';
        
        if (joinTime) {
            const diff = Math.floor((now - joinTime) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            const mm = String(m).padStart(2, '0');
            const ss = String(s).padStart(2, '0');
            timeString = `\n通話時間: ${h}:${mm}:${ss}`;
        }
        
        const leaveEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('VCから切断しました')
            .setDescription(`**${member.displayName}**\n<#${oldState.channelId}> から退出しました\n\n<t:${unixTime}:F>${timeString}`)
            .setThumbnail(member.user.displayAvatarURL());
        channel.send({ embeds: [leaveEmbed] });
        
        userJoinTimes.set(member.id, now);
        
        const joinEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('VCに接続しました')
            .setDescription(`**${member.displayName}**\n<#${newState.channelId}> に参加しました\n\n<t:${unixTime}:F>`)
            .setThumbnail(member.user.displayAvatarURL());
        channel.send({ embeds: [joinEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
