        window.addEventListener('DOMContentLoaded', () => {
            const userData = JSON.parse(localStorage.getItem('data'));

            if (!userData) {
                window.location.href = '/'; 
                return;
            }

            // Usuário autenticado
            document.getElementById('userName').textContent = userData.name;

            initializeMap();
        });
        
        function initializeMap() {
            mapboxgl.accessToken = 'pk.eyJ1IjoiYWdyb3BpeGVsMjIiLCJhIjoiY21icDRzbGFoMDBxcDJrcTNlM2F3Nm9hZyJ9.2XDhgY8WSZ9QLgZ7y0kf0A';
            
            const map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/light-v11', 
                center: [-46.6333, -23.5505], 
                zoom: 11, 
                pitch: 45, 
                bearing: -17.6 
            });
            
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            map.addControl(new mapboxgl.ScaleControl());
            
            map.on('load', () => {
                
                map.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                });
                
                map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            });
        }
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('data');
            window.location.href = '/';
        });
