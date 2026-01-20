
let map; 

        window.addEventListener('DOMContentLoaded', () => {
            const userData = JSON.parse(localStorage.getItem('data'));

            if (!userData) {
                window.location.href = '/'; 
                return;
            }

            document.getElementById('userName').textContent = userData.name;

            initializeMap();
        });
        
        function initializeMap() {
            mapboxgl.accessToken = 'pk.eyJ1IjoiYWdyb3BpeGVsMjIiLCJhIjoiY21icDRzbGFoMDBxcDJrcTNlM2F3Nm9hZyJ9.2XDhgY8WSZ9QLgZ7y0kf0A';
            
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11',
                center: [-49.9465156, -21.4603331],
                zoom: 11,
                pitch: 45,
                bearing: -17.6
            });

            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            map.addControl(new mapboxgl.ScaleControl());

            map.on('load', () => {
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14
                });

                map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

                // 🔥 carrega sensores quando o mapa estiver pronto
                loadSensorsOnMap();
            });
        }
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('data');
            window.location.href = '/';
        });
