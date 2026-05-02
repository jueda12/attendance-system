import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { deleteSite, listSites, type Site } from '@/lib/master-data-api'

const statusLabels: Record<Site['status'], string> = {
  active: '啟用',
  closed: '已關閉',
  deleted: '已刪除'
}

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : '-'
}

export function SitesListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [target, setTarget] = useState<Site | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: ['sites'], queryFn: listSites })
  const deleteMutation = useMutation({
    mutationFn: deleteSite,
    onSuccess: async () => {
      setTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['sites'] })
      toast.show('已刪除地盤')
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">地盤</h1>
            <p className="text-sm text-slate-600">管理地盤基本資料與狀態。</p>
          </div>
          <Button onClick={() => navigate('/sites/new')}>新增地盤</Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          {isLoading ? <p className="p-6 text-slate-600">載入中...</p> : null}
          {isError ? <p className="p-6 text-red-600">載入地盤失敗</p> : null}
          {!isLoading && !isError && data?.data.length === 0 ? <p className="p-6 text-slate-600">尚未有地盤紀錄，請點「新增地盤」。</p> : null}
          {data?.data.length ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">代碼</th>
                  <th className="px-4 py-3">名稱</th>
                  <th className="px-4 py-3">地址</th>
                  <th className="px-4 py-3">開始日期</th>
                  <th className="px-4 py-3">結束日期</th>
                  <th className="px-4 py-3">項目經理</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.data.map((site) => (
                  <tr key={site.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{site.code}</td>
                    <td className="px-4 py-3">{site.nameZh}</td>
                    <td className="px-4 py-3">{site.address ?? '-'}</td>
                    <td className="px-4 py-3">{formatDate(site.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(site.endDate)}</td>
                    <td className="px-4 py-3">{site.pmName ?? '-'}</td>
                    <td className="px-4 py-3">{statusLabels[site.status]}</td>
                    <td className="space-x-2 px-4 py-3">
                      <Link className="text-blue-600 hover:underline" to={`/sites/${site.id}`}>
                        編輯
                      </Link>
                      <button className="text-red-600 hover:underline" type="button" onClick={() => setTarget(site)}>
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      <Dialog open={target !== null}>
        <DialogContent>
          <h2 className="text-lg font-semibold">確認刪除地盤</h2>
          <p className="mt-2 text-sm text-slate-600">刪除後列表將不再顯示「{target?.nameZh}」。</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              取消
            </Button>
            <Button disabled={deleteMutation.isPending} onClick={() => target && deleteMutation.mutate(target.id)}>
              {deleteMutation.isPending ? '刪除中...' : '確認刪除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
