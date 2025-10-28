import Pusher from 'pusher-js';

const pusherInstance = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
    cluster: process.env.REACT_APP_PUSHER_CLUSTER,
    authEndpoint: '/api/auth/pusher',
    auth: {
        headers: {
            // Token akan di-set secara dinamis sebelum subscribe
            'x-auth-token': localStorage.getItem('token')
        }
    }
});

/**
 * Objek helper untuk asdasdPusher yang memungkinkan pembaruan token otentikasi secara dinamis.
 * Ini penting untuk memastikan otentikasi private channel berfungsi setelah pengguna login.
 */
const pusher = {
    subscribe: (channelName) => {
        // Selalu perbarui header dengan token terbaru sebelum melakukan subscribe
        pusherInstance.config.auth.headers['x-auth-token'] = localStorage.getItem('token');
        return pusherInstance.subscribe(channelName);
    },
    unsubscribe: (channelName) => pusherInstance.unsubscribe(channelName),
    // Anda bisa menambahkan metode lain dari pusherInstance jika diperlukan, seperti .bind()
    instance: pusherInstance
};

export default pusher;