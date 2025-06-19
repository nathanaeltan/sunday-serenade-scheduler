import React, { useEffect, useState } from 'react';
import { database } from '../lib/firebase';
import { ref, get, set, child } from 'firebase/database';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, X, Pencil, Trash2, Save, XCircle } from 'lucide-react';

// Fallback data (in case Firebase is empty)
const fallbackSongs = [
  { title: "a mighty fortress is our god", link1: "", link2: "" },
  { title: "all creatures of our god and king", link1: "", link2: "" },
  { title: "all hail the power of jesus' name", link1: "", link2: "" },
  { title: "ancient of days", link1: "", link2: "" },
  { title: "before the throne of god above", link1: "", link2: "" },
  // ... (add the rest or import from JSON if needed)
];

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Utility: Advanced Title Case
function toTitleCase(str) {
  const minorWords = [
    "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "so", "the", "to", "up", "yet"
  ];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i, arr) => {
      if (
        minorWords.includes(word) &&
        i !== 0 &&
        i !== arr.length - 1
      ) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function UniqueSongsManager() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', link1: '', link2: '', spotify: '' });
  const [addingSong, setAddingSong] = useState(false);
  const [search, setSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState({ title: '', artist: '', link1: '', link2: '', spotify: '' });
  const [showDeleteIdx, setShowDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'uniqueSongs'));
        if (snapshot.exists()) {
          // Data is an object keyed by slug, convert to array
          const data = snapshot.val() as Record<string, { title: string; artist?: string; link1: string; link2: string; spotify?: string }>;
          const loaded = Object.entries(data).map(([slug, value]) => ({
            title: value.title || slug,
            artist: value.artist || '',
            link1: value.link1,
            link2: value.link2,
            spotify: value.spotify || ''
          }));
          setSongs(loaded);
        } else {
          setSongs(fallbackSongs.map(song => ({ ...song, artist: '', spotify: '' })));
        }
      } catch (e) {
        setSongs(fallbackSongs.map(song => ({ ...song, artist: '', spotify: '' })));
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const handleChange = (idx, field, value) => {
    setSongs(songs => songs.map((song, i) => i === idx ? { ...song, [field]: value } : song));
  };

  const handleSave = async (idx) => {
    const song = songs[idx];
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(song.title)}`), {
        title: song.title,
        artist: song.artist,
        link1: song.link1,
        link2: song.link2,
        spotify: song.spotify,
      });
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  const handleDelete = async (idx) => {
    const song = songs[idx];
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(song.title)}`), null);
      setSongs(songs => songs.filter((_, i) => i !== idx));
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const text = await file.text();
      const importedArray = JSON.parse(text);
      // Slugify and transform
      const songsObj = {};
      importedArray.forEach(song => {
        const slug = slugify(song.title);
        songsObj[slug] = {
          title: song.title,
          artist: song.artist || '',
          link1: song.link1 || '',
          link2: song.link2 || '',
          spotify: song.spotify || ''
        };
      });
      await set(ref(database, 'uniqueSongs'), songsObj);
      setImportMessage('Successfully imported songs!');
      // Update local state
      setSongs(importedArray);
    } catch (err) {
      setImportMessage('Error importing songs: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export songs as JSON file
  const handleExport = () => {
    const dataStr = JSON.stringify(songs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unique_songs.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddSong = async () => {
    if (!newSong.title.trim()) {
      alert('Please enter a song title');
      return;
    }

    setAddingSong(true);
    try {
      const songToAdd = {
        title: newSong.title.trim().toLowerCase(),
        artist: newSong.artist.trim(),
        link1: newSong.link1.trim(),
        link2: newSong.link2.trim(),
        spotify: newSong.spotify.trim(),
      };

      // Check if song already exists
      const existingSong = songs.find(song => song.title.toLowerCase() === songToAdd.title);
      if (existingSong) {
        alert('A song with this title already exists');
        return;
      }

      // Add to Firebase
      await set(ref(database, `uniqueSongs/${slugify(songToAdd.title)}`), songToAdd);
      
      // Update local state
      setSongs(prevSongs => [...prevSongs, songToAdd]);
      
      // Reset form
      setNewSong({ title: '', artist: '', link1: '', link2: '', spotify: '' });
      setShowAddForm(false);
    } catch (error) {
      alert('Error adding song: ' + error.message);
    } finally {
      setAddingSong(false);
    }
  };

  const handleCancelAdd = () => {
    setNewSong({ title: '', artist: '', link1: '', link2: '', spotify: '' });
    setShowAddForm(false);
  };

  // Filtered songs based on search
  const filteredSongs = songs.filter(song => {
    const q = search.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.link1 && song.link1.toLowerCase().includes(q)) ||
      (song.link2 && song.link2.toLowerCase().includes(q))
    );
  });

  // Start editing a song
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditBuffer({ ...filteredSongs[idx] });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIdx(null);
    setEditBuffer({ title: '', artist: '', link1: '', link2: '', spotify: '' });
  };

  // Save edit
  const saveEdit = async (idx: number) => {
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(editBuffer.title)}`), {
        title: editBuffer.title,
        artist: editBuffer.artist,
        link1: editBuffer.link1,
        link2: editBuffer.link2,
        spotify: editBuffer.spotify,
      });
      setSongs(songs => songs.map((song, i) => i === idx ? { ...editBuffer } : song));
      setEditingIdx(null);
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async (idx: number) => {
    setSaving(s => ({ ...s, [idx]: true }));
    try {
      await set(ref(database, `uniqueSongs/${slugify(songs[idx].title)}`), null);
      setSongs(songs => songs.filter((_, i) => i !== idx));
      setShowDeleteIdx(null);
    } finally {
      setSaving(s => ({ ...s, [idx]: false }));
    }
  };

  if (loading) return <div>Loading songs...</div>;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Songs & Links</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Song
            </Button>
            <label htmlFor="import-songs-json">
              <Button asChild size="sm" variant="outline" disabled={importing}>
                <span>{importing ? 'Importing...' : 'Import JSON'}</span>
              </Button>
              <input
                id="import-songs-json"
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleImport}
                disabled={importing}
              />
            </label>
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </div>
        </div>
        {/* Search Bar */}
        <div className="mt-4">
          <Input
            placeholder="Search songs by title or link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        {importMessage && (
          <div className={`mt-2 text-sm ${importMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{importMessage}</div>
        )}
      </CardHeader>
      <CardContent>
        {/* Add Song Form */}
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900">Add New Song</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Song Title *
                </label>
                <Input
                  placeholder="Enter song title"
                  value={newSong.title}
                  onChange={e => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Artist
                </label>
                <Input
                  placeholder="Enter artist name"
                  value={newSong.artist}
                  onChange={e => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Link 1 (e.g. YouTube, Chord Sheet)
                  </label>
                  <Input
                    placeholder="Optional link"
                    value={newSong.link1}
                    onChange={e => setNewSong(prev => ({ ...prev, link1: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Link 2 (optional)
                  </label>
                  <Input
                    placeholder="Optional second link"
                    value={newSong.link2}
                    onChange={e => setNewSong(prev => ({ ...prev, link2: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">
                  Spotify Link (optional)
                </label>
                <Input
                  placeholder="https://open.spotify.com/track/..."
                  value={newSong.spotify}
                  onChange={e => setNewSong(prev => ({ ...prev, spotify: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddSong}
                  disabled={addingSong || !newSong.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addingSong ? 'Adding...' : 'Add Song'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelAdd}
                  disabled={addingSong}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredSongs.map((song, idx) => (
            <div key={song.title} className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-stretch gap-2">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="font-semibold mb-1">{toTitleCase(song.title)}</div>
                  {song.artist && (
                    <div className="text-xs text-gray-600 mb-1">Artist: {song.artist}</div>
                  )}
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Link 1 (e.g. YouTube, Chord Sheet)"
                      value={editingIdx === idx ? editBuffer.link1 : song.link1}
                      onChange={e => setEditBuffer(buf => ({ ...buf, link1: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                    <Input
                      placeholder="Link 2 (optional)"
                      value={editingIdx === idx ? editBuffer.link2 : song.link2}
                      onChange={e => setEditBuffer(buf => ({ ...buf, link2: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 mt-2">
                    <Input
                      placeholder="Artist"
                      value={editingIdx === idx ? editBuffer.artist : song.artist}
                      onChange={e => setEditBuffer(buf => ({ ...buf, artist: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                    <Input
                      placeholder="Spotify Link (optional)"
                      value={editingIdx === idx ? editBuffer.spotify : song.spotify}
                      onChange={e => setEditBuffer(buf => ({ ...buf, spotify: e.target.value }))}
                      disabled={editingIdx !== idx}
                    />
                  </div>
                  {song.spotify && (
                    <div className="mt-1">
                      <a href={song.spotify} target="_blank" rel="noopener noreferrer" className="text-green-600 underline text-sm flex items-center gap-1">
                        <svg width="16" height="16" viewBox="0 0 168 168" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="84" cy="84" r="84" fill="#1ED760"/><path d="M122.1 116.2c-2.1 3.4-6.5 4.5-9.9 2.4-27.1-16.6-61.3-20.4-101.7-11.2-3.9.9-7.8-1.5-8.7-5.4-.9-3.9 1.5-7.8 5.4-8.7 43.2-9.7 80.1-5.6 110.1 12.2 3.4 2.1 4.5 6.5 2.4 9.9zm13.9-25.6c-2.6 4.2-8.1 5.6-12.3 3-31.1-19-78.5-24.6-115.2-13.5-4.7 1.4-9.7-1.2-11.1-5.9-1.4-4.7 1.2-9.7 5.9-11.1 41.7-12.2 93.2-6.1 128.2 15.1 4.2 2.6 5.6 8.1 3 12.4zm14.1-28.1c-36.2-21.5-96.2-23.5-130.2-12.9-5.3 1.6-10.9-1.3-12.5-6.6-1.6-5.3 1.3-10.9 6.6-12.5 37.2-11.3 102.6-9.1 143.2 14.1 5 3 6.6 9.5 3.6 14.5-3 5-9.5 6.6-14.5 3.6z" fill="#fff"/></svg>
                        Spotify
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row md:flex-col gap-2 md:justify-end md:items-end mt-2 md:mt-0">
                {editingIdx === idx ? (
                  <>
                    <Button
                      onClick={() => saveEdit(idx)}
                      disabled={saving[idx]}
                      className="w-10 h-10 flex items-center justify-center"
                      variant="default"
                    >
                      <Save className="w-5 h-5" />
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      className="w-10 h-10 flex items-center justify-center"
                      variant="outline"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => startEdit(idx)}
                      className="w-10 h-10 flex items-center justify-center"
                      variant="outline"
                    >
                      <Pencil className="w-5 h-5" />
                    </Button>
                    <Button
                      onClick={() => setShowDeleteIdx(idx)}
                      className="w-10 h-10 flex items-center justify-center"
                      variant="destructive"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
              {/* Delete confirmation dialog */}
              {showDeleteIdx === idx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
                    <div className="mb-4 font-semibold text-lg">Delete Song?</div>
                    <div className="mb-4 text-gray-700">Are you sure you want to delete <span className="font-bold">{toTitleCase(song.title)}</span>?</div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowDeleteIdx(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => confirmDelete(idx)} disabled={saving[idx]}>Delete</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 