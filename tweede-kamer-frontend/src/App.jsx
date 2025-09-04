import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Search, Filter, Calendar, User, Building2, CheckCircle, XCircle, Clock } from 'lucide-react'
import './App.css'

const API_BASE_URL = '/api'

function App() {
  const [moties, setMoties] = useState([])
  const [fracties, setFracties] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVoorPartijen, setSelectedVoorPartijen] = useState([])
  const [selectedTegenPartijen, setSelectedTegenPartijen] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredMoties, setFilteredMoties] = useState([])

  // Fetch fracties on component mount
  useEffect(() => {
    fetchFracties()
    fetchMoties()
  }, [])

  // Filter moties based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = moties.filter(motie => 
        motie.titel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        motie.onderwerp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        motie.indieners?.some(indiener => 
          indiener.naam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          indiener.fractie?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      setFilteredMoties(filtered)
    } else {
      setFilteredMoties(moties)
    }
  }, [searchTerm, moties])

  const fetchFracties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fracties`)
      const data = await response.json()
      setFracties(data.fracties || [])
    } catch (error) {
      console.error('Error fetching fracties:', error)
    }
  }

  const fetchMoties = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/moties?limit=20`)
      const data = await response.json()
      setMoties(data.moties || [])
    } catch (error) {
      console.error('Error fetching moties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterMoties = async () => {
    if (selectedVoorPartijen.length === 0 && selectedTegenPartijen.length === 0) {
      fetchMoties()
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/moties/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voor_partijen: selectedVoorPartijen,
          tegen_partijen: selectedTegenPartijen,
        }),
      })
      const data = await response.json()
      setMoties(data.moties || [])
    } catch (error) {
      console.error('Error filtering moties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePartijToggle = (partijNaam, type) => {
    if (type === 'voor') {
      setSelectedVoorPartijen(prev => 
        prev.includes(partijNaam) 
          ? prev.filter(p => p !== partijNaam)
          : [...prev, partijNaam]
      )
    } else {
      setSelectedTegenPartijen(prev => 
        prev.includes(partijNaam) 
          ? prev.filter(p => p !== partijNaam)
          : [...prev, partijNaam]
      )
    }
  }

  const clearFilters = () => {
    setSelectedVoorPartijen([])
    setSelectedTegenPartijen([])
    setSearchTerm('')
    fetchMoties()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Onbekend'
    return new Date(dateString).toLocaleDateString('nl-NL')
  }

  const getKabinetsappreciatieColor = (appreciatie) => {
    switch (appreciatie) {
      case 'Overgenomen':
        return 'bg-green-100 text-green-800'
      case 'Ontraden':
        return 'bg-red-100 text-red-800'
      case 'Nog niet bekend':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Tweede Kamer Moties
          </h1>
          <p className="text-lg text-gray-600">
            Analyseer stemgedrag van politieke partijen op ingediende moties
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Filter moties op basis van stemgedrag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Zoeken</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Zoek in titel, onderwerp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Separator />

                {/* Voor partijen */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Partijen die VOOR stemden
                  </Label>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {fracties.map((fractie) => (
                        <div key={`voor-${fractie.id}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`voor-${fractie.id}`}
                            checked={selectedVoorPartijen.includes(fractie.naam)}
                            onCheckedChange={() => handlePartijToggle(fractie.naam, 'voor')}
                          />
                          <Label 
                            htmlFor={`voor-${fractie.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {fractie.afkorting} ({fractie.zetels})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Tegen partijen */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Partijen die TEGEN stemden
                  </Label>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {fracties.map((fractie) => (
                        <div key={`tegen-${fractie.id}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tegen-${fractie.id}`}
                            checked={selectedTegenPartijen.includes(fractie.naam)}
                            onCheckedChange={() => handlePartijToggle(fractie.naam, 'tegen')}
                          />
                          <Label 
                            htmlFor={`tegen-${fractie.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {fractie.afkorting} ({fractie.zetels})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Filter buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleFilterMoties} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Laden...' : 'Filter toepassen'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearFilters} 
                    className="w-full"
                  >
                    Filters wissen
                  </Button>
                </div>

                {/* Active filters display */}
                {(selectedVoorPartijen.length > 0 || selectedTegenPartijen.length > 0) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Actieve filters:</Label>
                    <div className="space-y-1">
                      {selectedVoorPartijen.map(partij => (
                        <Badge key={`badge-voor-${partij}`} variant="secondary" className="text-xs">
                          Voor: {partij}
                        </Badge>
                      ))}
                      {selectedTegenPartijen.map(partij => (
                        <Badge key={`badge-tegen-${partij}`} variant="destructive" className="text-xs">
                          Tegen: {partij}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main content - Moties list */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Moties ({filteredMoties.length})
                </h2>
                {loading && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 animate-spin" />
                    Laden...
                  </div>
                )}
              </div>

              {/* Moties cards */}
              {filteredMoties.length === 0 && !loading ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">
                      Geen moties gevonden met de huidige filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredMoties.map((motie) => (
                    <Card key={motie.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {motie.titel || 'Geen titel'}
                            </CardTitle>
                            <CardDescription>
                              {motie.onderwerp}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {motie.nummer}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Motie details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>Ingediend: {formatDate(motie.gestartOp)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span>Status: {motie.status}</span>
                            </div>
                          </div>

                          {/* Indieners */}
                          {motie.indieners && motie.indieners.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Indieners:
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {motie.indieners.map((indiener, index) => (
                                  <Badge key={index} variant="secondary">
                                    {indiener.naam} ({indiener.fractie})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Kabinetsappreciatie */}
                          {motie.kabinetsappreciatie && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Kabinetsappreciatie:
                              </Label>
                              <Badge 
                                className={getKabinetsappreciatieColor(motie.kabinetsappreciatie)}
                              >
                                {motie.kabinetsappreciatie}
                              </Badge>
                            </div>
                          )}

                          {/* Stemmingen (if available) */}
                          {motie.stemmingen && Object.keys(motie.stemmingen).length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Stemgedrag:
                              </Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(motie.stemmingen).map(([fractie, stemming]) => (
                                  <Badge 
                                    key={fractie}
                                    variant={stemming === 'Voor' ? 'default' : stemming === 'Tegen' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {fractie}: {stemming}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

