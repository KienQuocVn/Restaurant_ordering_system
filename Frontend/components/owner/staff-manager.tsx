'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Staff {
  id: string
  name: string
  email: string
  is_active?: boolean
}

interface ActivityLog {
  id: string
  action: string
  detail: string
  created_at: string
}

interface StaffManagerProps {
  staff: Staff[]
  logs: ActivityLog[]
  onCreateStaff: (payload: { name: string; email: string; password: string }) => void
  onToggleStaff: (staffId: string, isActive: boolean) => void
  onDeleteStaff: (staffId: string) => void
  loading?: boolean
}

export function StaffManager({
  staff,
  logs,
  onCreateStaff,
  onToggleStaff,
  onDeleteStaff,
  loading,
}: StaffManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Input
              placeholder="Staff name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={loading}
            />
            <Input
              placeholder="Staff email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={loading}
            />
            <Input
              placeholder="Temporary password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              disabled={loading}
            />
            <Button
              className="bg-[#2ad38b] hover:bg-[#0cceb0]"
              disabled={loading || !formData.name || !formData.email || !formData.password}
              onClick={() => {
                onCreateStaff(formData)
                setFormData({ name: '', email: '', password: '' })
              }}
            >
              Create Staff
            </Button>
          </div>

          <div className="space-y-3">
            {staff.length === 0 ? (
              <p className="text-sm text-gray-500">No staff accounts</p>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border bg-gray-50 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      {member.is_active === false ? 'Inactive' : 'Active'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => onToggleStaff(member.id, member.is_active === false)}
                    >
                      {member.is_active === false ? 'Activate' : 'Deactivate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={loading}
                      onClick={() => onDeleteStaff(member.id)}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No activity logs yet</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-lg border bg-gray-50 p-3">
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-sm text-gray-600">{log.detail}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
