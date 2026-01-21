import React, { useState } from 'react';
import { Map } from '../components/Map';
import { rideAPI, pricingAPI } from '../services/api';
import toast from 'react-hot-toast';
import { MapPin, Navigation, Car, Clock, DollarSign } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface PricingResult {
  estimatedFare: number;
  distance: number;
  duration: number;
  pricingFactors: any;
  surgeMultiplier: number;
}

const BookingPage: React.FC = () => {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [vehicleType, setVehicleType] = useState('standard');
  const [specialRequests, setSpecialRequests] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const vehicleTypes = [
    { id: 'standard', name: 'Standard', price: 'From 12k VND' },
    { id: 'premium', name: 'Premium', price: 'From 20k VND' },
    { id: 'suv', name: 'SUV', price: 'From 25k VND' },
    { id: 'van', name: 'Van', price: 'From 30k VND' }
  ];

  const specialRequestOptions = [
    { id: 'child_seat', name: 'Child Seat', price: '+5k VND' },
    { id: 'extra_luggage', name: 'Extra Luggage', price: '+10k VND' },
    { id: 'pet_friendly', name: 'Pet Friendly', price: '+15k VND' },
    { id: 'meet_and_greet', name: 'Meet & Greet', price: '+8k VND' }
  ];

  const handleSpecialRequestToggle = (requestId: string) => {
    setSpecialRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const calculatePrice = async () => {
    if (!pickupLocation || !destination) {
      toast.error('Please select both pickup and destination locations');
      return;
    }

    setLoading(true);
    try {
      const rideData = {
        distance: calculateDistance(pickupLocation, destination),
        duration: estimateDuration(pickupLocation, destination),
        vehicleType,
        pickupTime: new Date().toISOString(),
        pickupLocation,
        destination,
        specialRequests,
        userHistory: {} // Will be populated from user profile
      };

      const response = await pricingAPI.calculatePrice(rideData);
      setPricing(response.data);
    } catch (error: any) {
      toast.error('Failed to calculate price');
      console.error('Pricing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!pickupLocation || !destination || !pricing) {
      toast.error('Please complete all booking details');
      return;
    }

    setBooking(true);
    try {
      const rideData = {
        userId: 'current-user-id', // Will be populated from auth context
        pickup: pickupLocation,
        destination,
        vehicleType,
        estimatedFare: pricing.estimatedFare,
        specialRequests,
        source: 'web_app'
      };

      const response = await rideAPI.createRide(rideData);
      toast.success('Ride booked successfully!');

      // Reset form
      setPickupLocation(null);
      setDestination(null);
      setPricing(null);
      setSpecialRequests([]);

      // Navigate to ride tracking or show success message

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking failed');
      console.error('Booking error:', error);
    } finally {
      setBooking(false);
    }
  };

  const calculateDistance = (loc1: Location, loc2: Location): number => {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const estimateDuration = (loc1: Location, loc2: Location): number => {
    const distance = calculateDistance(loc1, loc2);
    // Estimate 30 km/h average speed in city
    const speed = 30; // km/h
    return Math.ceil((distance / speed) * 60); // minutes
  };

  const markers = [];
  if (pickupLocation) markers.push({ ...pickupLocation, address: 'Pickup' });
  if (destination) markers.push({ ...destination, address: 'Destination' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Ride</h1>
              <p className="text-gray-600">Select pickup and destination locations</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <Map
                center={{ lat: 10.762622, lng: 106.660172 }}
                zoom={13}
                onLocationSelect={(location) => {
                  if (!pickupLocation) {
                    setPickupLocation(location);
                  } else if (!destination) {
                    setDestination(location);
                  } else {
                    // Reset and set pickup
                    setPickupLocation(location);
                    setDestination(null);
                    setPricing(null);
                  }
                }}
                markers={markers}
                height="400px"
                className="mb-4"
              />

              {/* Location Inputs */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Pickup Location</label>
                    <input
                      type="text"
                      value={pickupLocation ? `${pickupLocation.lat.toFixed(6)}, ${pickupLocation.lng.toFixed(6)}` : ''}
                      readOnly
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Click on map to select pickup"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Navigation className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                    <input
                      type="text"
                      value={destination ? `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}` : ''}
                      readOnly
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="Click on map to select destination"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form Section */}
          <div className="space-y-6">
            {/* Vehicle Type Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Choose Vehicle Type
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {vehicleTypes.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
                      vehicleType === vehicle.id
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicle-type"
                      value={vehicle.id}
                      checked={vehicleType === vehicle.id}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{vehicle.name}</p>
                          <p className="text-sm text-gray-500">{vehicle.price}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Special Requests */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Special Requests (Optional)</h2>
              <div className="space-y-3">
                {specialRequestOptions.map((request) => (
                  <label key={request.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={specialRequests.includes(request.id)}
                      onChange={() => handleSpecialRequestToggle(request.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm">
                      <span className="font-medium">{request.name}</span>
                      <span className="text-gray-500 ml-2">{request.price}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing */}
            {pickupLocation && destination && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Trip Details</h2>
                  <button
                    onClick={calculatePrice}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Calculating...' : 'Calculate Price'}
                  </button>
                </div>

                {pricing && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Estimated Fare
                      </span>
                      <span className="font-semibold text-lg">
                        {pricing.estimatedFare.toLocaleString()} VND
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <Navigation className="h-4 w-4 mr-1" />
                        Distance
                      </span>
                      <span>{pricing.distance.toFixed(1)} km</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Duration
                      </span>
                      <span>{pricing.duration} min</span>
                    </div>

                    {pricing.surgeMultiplier > 1 && (
                      <div className="bg-yellow-50 p-3 rounded-md">
                        <p className="text-sm text-yellow-800">
                          🚀 Surge pricing active: {pricing.surgeMultiplier}x multiplier
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleBooking}
                      disabled={booking}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
                    >
                      {booking ? 'Booking...' : 'Book Ride'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;