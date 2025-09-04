from flask import Blueprint, jsonify, request
import requests
from datetime import datetime
import json

moties_bp = Blueprint('moties', __name__)

# Base URL voor de Tweede Kamer OData API
BASE_URL = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0"

def get_odata_request(endpoint, params=None):
    """Helper functie om OData API requests te maken"""
    try:
        url = f"{BASE_URL}/{endpoint}"
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error making request to {url}: {e}")
        return None

@moties_bp.route('/moties', methods=['GET'])
def get_moties():
    """Haal alle moties op met basis informatie"""
    try:
        # Parameters voor filtering
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # OData query voor moties (Zaak entiteit met Soort = 'Motie')
        skip = (page - 1) * limit
        
        params = {
            '$filter': "Verwijderd eq false and Soort eq 'Motie'",
            '$orderby': 'GestartOp desc',
            '$top': limit,
            '$skip': skip,
            '$expand': 'ZaakActor($expand=Persoon,Fractie)'
        }
        
        data = get_odata_request('Zaak', params)
        
        if not data:
            return jsonify({'error': 'Kon geen data ophalen van de API'}), 500
            
        moties = []
        for motie in data.get('value', []):
            # Verwerk de motie data
            motie_info = {
                'id': motie.get('Id'),
                'nummer': motie.get('Nummer'),
                'titel': motie.get('Titel'),
                'onderwerp': motie.get('Onderwerp'),
                'gestartOp': motie.get('GestartOp'),
                'status': motie.get('Status'),
                'kabinetsappreciatie': motie.get('Kabinetsappreciatie'),
                'indieners': []
            }
            
            # Verwerk indieners
            zaak_actors = motie.get('ZaakActor', [])
            for actor in zaak_actors:
                if actor.get('Relatie') == 'Indiener':
                    indiener_info = {
                        'naam': actor.get('ActorNaam'),
                        'fractie': actor.get('ActorFractie')
                    }
                    motie_info['indieners'].append(indiener_info)
            
            moties.append(motie_info)
        
        return jsonify({
            'moties': moties,
            'page': page,
            'limit': limit,
            'total': len(moties)
        })
        
    except Exception as e:
        print(f"Error in get_moties: {e}")
        return jsonify({'error': 'Er is een fout opgetreden bij het ophalen van moties'}), 500

@moties_bp.route('/moties/<motie_id>/stemmingen', methods=['GET'])
def get_motie_stemmingen(motie_id):
    """Haal stemmingsinformatie op voor een specifieke motie"""
    try:
        # Eerst de motie ophalen om het bijbehorende besluit te vinden
        motie_params = {
            '$filter': f"Id eq guid'{motie_id}'",
            '$expand': 'Besluit($expand=Stemming($expand=Fractie,Persoon))'
        }
        
        motie_data = get_odata_request('Zaak', motie_params)
        
        if not motie_data or not motie_data.get('value'):
            return jsonify({'error': 'Motie niet gevonden'}), 404
            
        motie = motie_data['value'][0]
        stemmingen = []
        
        # Verwerk besluiten en stemmingen
        besluiten = motie.get('Besluit', [])
        for besluit in besluiten:
            stemming_data = besluit.get('Stemming', [])
            for stemming in stemming_data:
                stemming_info = {
                    'id': stemming.get('Id'),
                    'soort': stemming.get('Soort'),
                    'actorNaam': stemming.get('ActorNaam'),
                    'actorFractie': stemming.get('ActorFractie'),
                    'fractieGrootte': stemming.get('FractieGrootte'),
                    'vergissing': stemming.get('Vergissing', False)
                }
                stemmingen.append(stemming_info)
        
        # Groepeer stemmingen per fractie
        fractie_stemmingen = {}
        for stemming in stemmingen:
            fractie = stemming['actorFractie']
            if fractie not in fractie_stemmingen:
                fractie_stemmingen[fractie] = {
                    'fractie': fractie,
                    'stemming': stemming['soort'],
                    'grootte': stemming['fractieGrootte']
                }
        
        return jsonify({
            'motie_id': motie_id,
            'motie_titel': motie.get('Titel'),
            'stemmingen': list(fractie_stemmingen.values())
        })
        
    except Exception as e:
        print(f"Error in get_motie_stemmingen: {e}")
        return jsonify({'error': 'Er is een fout opgetreden bij het ophalen van stemmingen'}), 500

@moties_bp.route('/fracties', methods=['GET'])
def get_fracties():
    """Haal alle actieve fracties op"""
    try:
        params = {
            '$filter': 'Verwijderd eq false and DatumInactief eq null',
            '$orderby': 'NaamNL'
        }
        
        data = get_odata_request('Fractie', params)
        
        if not data:
            return jsonify({'error': 'Kon geen fracties ophalen'}), 500
            
        fracties = []
        for fractie in data.get('value', []):
            fractie_info = {
                'id': fractie.get('Id'),
                'naam': fractie.get('NaamNL'),
                'afkorting': fractie.get('Afkorting'),
                'zetels': fractie.get('AantalZetels', 0)
            }
            fracties.append(fractie_info)
        
        return jsonify({'fracties': fracties})
        
    except Exception as e:
        print(f"Error in get_fracties: {e}")
        return jsonify({'error': 'Er is een fout opgetreden bij het ophalen van fracties'}), 500

@moties_bp.route('/moties/filter', methods=['POST'])
def filter_moties():
    """Filter moties op basis van stemgedrag van partijen"""
    try:
        filter_data = request.json
        voor_partijen = filter_data.get('voor_partijen', [])
        tegen_partijen = filter_data.get('tegen_partijen', [])
        
        # Basis query voor moties
        params = {
            '$filter': "Verwijderd eq false and Soort eq 'Motie'",
            '$orderby': 'GestartOp desc',
            '$top': 100,
            '$expand': 'ZaakActor($expand=Persoon,Fractie),Besluit($expand=Stemming($expand=Fractie))'
        }
        
        data = get_odata_request('Zaak', params)
        
        if not data:
            return jsonify({'error': 'Kon geen data ophalen'}), 500
            
        gefilterde_moties = []
        
        for motie in data.get('value', []):
            # Verzamel stemmingen voor deze motie
            motie_stemmingen = {}
            
            besluiten = motie.get('Besluit', [])
            for besluit in besluiten:
                stemmingen = besluit.get('Stemming', [])
                for stemming in stemmingen:
                    fractie_naam = stemming.get('ActorFractie')
                    stemming_soort = stemming.get('Soort')
                    
                    if fractie_naam and stemming_soort:
                        motie_stemmingen[fractie_naam] = stemming_soort
            
            # Check of motie voldoet aan filter criteria
            voldoet_aan_filter = True
            
            # Check voor_partijen
            for partij in voor_partijen:
                if partij not in motie_stemmingen or motie_stemmingen[partij] != 'Voor':
                    voldoet_aan_filter = False
                    break
            
            # Check tegen_partijen
            if voldoet_aan_filter:
                for partij in tegen_partijen:
                    if partij not in motie_stemmingen or motie_stemmingen[partij] != 'Tegen':
                        voldoet_aan_filter = False
                        break
            
            if voldoet_aan_filter:
                # Verwerk motie info
                motie_info = {
                    'id': motie.get('Id'),
                    'nummer': motie.get('Nummer'),
                    'titel': motie.get('Titel'),
                    'onderwerp': motie.get('Onderwerp'),
                    'gestartOp': motie.get('GestartOp'),
                    'status': motie.get('Status'),
                    'kabinetsappreciatie': motie.get('Kabinetsappreciatie'),
                    'stemmingen': motie_stemmingen,
                    'indieners': []
                }
                
                # Verwerk indieners
                zaak_actors = motie.get('ZaakActor', [])
                for actor in zaak_actors:
                    if actor.get('Relatie') == 'Indiener':
                        indiener_info = {
                            'naam': actor.get('ActorNaam'),
                            'fractie': actor.get('ActorFractie')
                        }
                        motie_info['indieners'].append(indiener_info)
                
                gefilterde_moties.append(motie_info)
        
        return jsonify({
            'moties': gefilterde_moties,
            'filter': {
                'voor_partijen': voor_partijen,
                'tegen_partijen': tegen_partijen
            },
            'total': len(gefilterde_moties)
        })
        
    except Exception as e:
        print(f"Error in filter_moties: {e}")
        return jsonify({'error': 'Er is een fout opgetreden bij het filteren van moties'}), 500

